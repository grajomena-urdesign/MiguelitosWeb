CREATE TABLE `guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "transaction_validation" CHECK("guards"."ok"=1)
);

--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`size` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL,
	`percent` integer NOT NULL,
	`discount` integer NOT NULL,
	`net` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_unique` ON `members` (`user_id`);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`date` text NOT NULL,
	`user` text NOT NULL,
	`remarks` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE INDEX `movements_product` ON `movements` (`product_id`);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`size` text DEFAULT 'Regular' NOT NULL,
	`price` integer NOT NULL,
	`stock` integer NOT NULL,
	`reorder` integer DEFAULT 10 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`image` text,
	`version` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("products"."stock">=0),
	CONSTRAINT "price_nonnegative" CHECK("products"."price">=0)
);

--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt` text NOT NULL,
	`date` text NOT NULL,
	`cashier` text NOT NULL,
	`cashier_email` text NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer NOT NULL,
	`tax` integer NOT NULL,
	`total` integer NOT NULL,
	`payment` text NOT NULL,
	`received` integer NOT NULL,
	`change_amount` integer NOT NULL,
	`discount_type` text DEFAULT '' NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`receipt_text` text NOT NULL,
	`request_hash` text NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX `sales_receipt_unique` ON `sales` (`receipt`);
--> statement-breakpoint
CREATE INDEX `sales_date` ON `sales` (`date`);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`footer` text NOT NULL
);

