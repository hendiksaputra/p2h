-- CreateTable
CREATE TABLE `inspection_roadworthiness_history` (
    `id` VARCHAR(191) NOT NULL,
    `inspection_id` VARCHAR(191) NOT NULL,
    `roadworthiness` ENUM('LAYAK_JALAN', 'RUSAK_RINGAN_PERLU_PERBAIKAN', 'TIDAK_LAYAK_JALAN') NOT NULL,
    `source` ENUM('PEMERIKSAAN_AWAL', 'PEMBARUAN_PERBAIKAN') NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inspection_roadworthiness_history_inspection_id_recorded_at_idx`(`inspection_id`, `recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inspection_roadworthiness_history` ADD CONSTRAINT `inspection_roadworthiness_history_inspection_id_fkey` FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: satu entri awal per inspeksi yang sudah punya roadworthiness (data lama)
INSERT INTO `inspection_roadworthiness_history` (`id`, `inspection_id`, `roadworthiness`, `source`, `recorded_at`)
SELECT CONCAT('mig_', `id`), `id`, `roadworthiness`, 'PEMERIKSAAN_AWAL', `inspected_at`
FROM `inspections`
WHERE `roadworthiness` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `inspection_roadworthiness_history` h WHERE h.`inspection_id` = `inspections`.`id`
  );
