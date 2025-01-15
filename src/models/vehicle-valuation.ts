import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class VehicleValuation {
  @PrimaryColumn({ length: 7 })
  vrm: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lowestValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  highestValue: number;

  @Column({ type: 'varchar', nullable: true })
  providerName: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get midpointValue(): number {
    return (this.highestValue + this.lowestValue) / 2;
  }
}
