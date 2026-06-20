CREATE TABLE "activities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"intervals_activity_id" text NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"duration_sec" integer,
	"distance_m" real,
	"avg_power" integer,
	"avg_hr" integer,
	"training_load" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities_raw" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activities_raw_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"intervals_activity_id" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_json" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_summary" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "daily_summary_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"training_load_daily" real NOT NULL,
	"load_7d" real NOT NULL,
	"load_28d" real NOT NULL,
	"acute_chronic_ratio" real NOT NULL,
	"ai_summary_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"intervals_athlete_id" text NOT NULL,
	"intervals_api_key_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wellness" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wellness_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"resting_hr" integer,
	"hrv" real,
	"sleep_sec" integer,
	"steps" integer,
	"weight_kg" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellness_raw" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wellness_raw_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_json" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_raw" ADD CONSTRAINT "activities_raw_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_summary" ADD CONSTRAINT "daily_summary_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness" ADD CONSTRAINT "wellness_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_raw" ADD CONSTRAINT "wellness_raw_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_user_id_intervals_activity_id_index" ON "activities" USING btree ("user_id","intervals_activity_id");--> statement-breakpoint
CREATE INDEX "activities_user_id_date_index" ON "activities" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_raw_user_id_intervals_activity_id_index" ON "activities_raw" USING btree ("user_id","intervals_activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_summary_user_id_date_index" ON "daily_summary" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "wellness_user_id_date_index" ON "wellness" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "wellness_raw_user_id_date_index" ON "wellness_raw" USING btree ("user_id","date");