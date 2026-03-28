"""S3 media helpers — lazy presigned-URL generation with upfront connectivity check.

Credentials are resolved automatically by boto3 in the following order:
  1. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN env vars
  2. ~/.aws/credentials file
  3. EC2 / ECS / Lambda IAM role (instance metadata service)

No credential configuration is needed in this codebase; just set the env vars
or rely on the instance role when running on AWS.
"""
from __future__ import annotations

import re

import boto3
from botocore.exceptions import BotoCoreError, ClientError

_S3_URL_RE = re.compile(r"^s3://([^/]+)/?(.*)$")

PRESIGNED_URL_TTL = 3600  # seconds


def is_s3_path(path: str) -> bool:
    return path.startswith("s3://")


def parse_s3_url(url: str) -> tuple[str, str]:
    """Return (bucket, prefix) from an s3:// URL.  prefix has no trailing slash."""
    m = _S3_URL_RE.match(url)
    if not m:
        raise ValueError(f"Invalid S3 URL: {url!r}")
    bucket = m.group(1)
    prefix = m.group(2).strip("/")
    return bucket, prefix


def _s3_key(prefix: str, rel_path: str) -> str:
    """Build the full S3 object key from a prefix and a relative file path."""
    if prefix:
        return f"{prefix}/{rel_path}"
    return rel_path


def _client():
    """Return a boto3 S3 client; uses env vars or IAM role automatically."""
    return boto3.client("s3")


def verify_s3_sample(bucket: str, prefix: str, sample_rel_path: str) -> None:
    """HEAD-check one file to confirm credentials and bucket/key are reachable.

    Raises RuntimeError with a descriptive message on any failure so the
    job_registry can log it and skip the job rather than crash silently.
    """
    key = _s3_key(prefix, sample_rel_path)
    try:
        _client().head_object(Bucket=bucket, Key=key)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        msg = exc.response["Error"].get("Message", "")
        raise RuntimeError(
            f"S3 connectivity check failed for s3://{bucket}/{key} — {code}: {msg}"
        ) from exc
    except BotoCoreError as exc:
        raise RuntimeError(
            f"S3 error for s3://{bucket}/{key}: {exc}"
        ) from exc


def generate_presigned_url(bucket: str, prefix: str, rel_path: str) -> str:
    """Return a time-limited presigned GET URL for a single S3 object."""
    key = _s3_key(prefix, rel_path)
    try:
        return _client().generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=PRESIGNED_URL_TTL,
        )
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(
            f"Failed to generate presigned URL for s3://{bucket}/{key}: {exc}"
        ) from exc
