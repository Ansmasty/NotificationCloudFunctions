export interface UnreadMessage {
    message_id: string;
    sender_name: string;
    message_text: string;
    sent_at: Date;
    type: string;
}

export interface CustomError extends Error{
    status?: number;
  }

export interface ServiceError extends Error{
    code?: string;
    details?: string;
    status?: number;
}