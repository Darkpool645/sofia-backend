-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TAREA', 'ACTIVIDAD', 'EXAMEN');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'TAREA';
