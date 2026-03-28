export interface Job {
  job_id: string;
  title?: string;
  item_count: number;
  annotated_count: number;
}

export interface ContentSchemaSlot {
  slot: string;
}

export interface FeedbackField {
  name: string;
  type: 'radio' | 'checkbox' | 'text';
  options: string[] | null;
}

export interface Spec {
  content_schema: ContentSchemaSlot[];
  feedbacks: FeedbackField[];
}

export interface Item {
  item_id: string;
  content_paths: string[];
  is_annotated: boolean;
}

export interface Annotation {
  item_id: string;
  values: AnnotationValues;
  updated_at: string;
}

export type AnnotationValues = Record<string, string | string[]>;
