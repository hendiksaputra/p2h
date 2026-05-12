-- CreateTable
CREATE TABLE `inspection_line_repairs` (
    `id` VARCHAR(191) NOT NULL,
    `inspection_line_id` VARCHAR(191) NOT NULL,
    `reporter_user_id` VARCHAR(191) NULL,
    `reporter_name` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inspection_line_repairs_inspection_line_id_idx`(`inspection_line_id`),
    INDEX `inspection_line_repairs_reporter_user_id_idx`(`reporter_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inspection_line_repairs` ADD CONSTRAINT `inspection_line_repairs_inspection_line_id_fkey` FOREIGN KEY (`inspection_line_id`) REFERENCES `inspection_lines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspection_line_repairs` ADD CONSTRAINT `inspection_line_repairs_reporter_user_id_fkey` FOREIGN KEY (`reporter_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
