export enum OutboxStatus {
  PENDING    = 'PENDING',
  PROCESSED  = 'PROCESSED',
  FAILED     = 'FAILED',
}

export class OutboxEvent {
  id!: string;
  eventType!: string;           // e.g. 'ORDER_CREATED'
  payload!: Record<string, any>;
  status!: OutboxStatus;
  createdAt!: Date;
  processedAt?: Date;
  retries!: number;
}
