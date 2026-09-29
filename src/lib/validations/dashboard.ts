import { z } from "zod";

// 클라이언트 폼과 API Route가 함께 쓰는 스키마
export const groupNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "그룹 이름을 입력해주세요.")
    .max(32, "그룹 이름은 32자 이하로 입력해주세요."),
});
export type GroupNameValues = z.infer<typeof groupNameSchema>;

export const groupIdSchema = z.coerce.number().int().positive();

// Matter node id는 숫자 문자열, SmartThings deviceId는 UUID
export const dashboardItemKeySchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("matter"), deviceId: z.string().regex(/^\d{1,20}$/) }),
  z.object({ source: z.literal("smartthings"), deviceId: z.uuid() }),
]);

export const dashboardItemBodySchema = z.object({
  groupId: groupIdSchema.nullable(),
});
