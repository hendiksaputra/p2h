-- AlterTable: tambah kolom snapshot awal
ALTER TABLE `inspection_lines`
  ADD COLUMN `initial_result` ENUM('OK', 'NOT_OK', 'NA') NOT NULL DEFAULT 'OK',
  ADD COLUMN `initial_notes` TEXT NULL;

-- Backfill: salin nilai sekarang ke snapshot awal untuk data lama (paling akurat yang tersedia)
UPDATE `inspection_lines`
SET `initial_result` = `result`,
    `initial_notes` = `notes`;

-- Index untuk pelaporan (poin yang awalnya tidak memenuhi standar)
CREATE INDEX `inspection_lines_initial_result_idx` ON `inspection_lines`(`initial_result`);
