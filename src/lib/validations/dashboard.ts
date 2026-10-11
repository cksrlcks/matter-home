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

// Matter node id는 숫자 문자열. SmartThings deviceId는 8-4-4-4-12 hex인데 Samsung OCF 가전은
// RFC-4122 버전/변형 비트가 맞지 않아 z.uuid()에 걸리므로 형태만 검사하는 z.guid()를 쓴다.
export const smartThingsDeviceIdSchema = z.guid();

const tileBase = {
  // null = 기기 전체, 숫자 = 다구 스위치의 구(endpoint)
  endpointId: z.number().int().nonnegative().nullable(),
  groupId: groupIdSchema.nullable(),
};

// 메인 화면 타일 전체(화면 순서). 같은 타일이 두 번 들어오면 거절한다.
export const dashboardLayoutSchema = z.object({
  items: z
    .array(
      z.discriminatedUnion("source", [
        z.object({
          source: z.literal("matter"),
          deviceId: z.string().regex(/^\d{1,20}$/),
          ...tileBase,
        }),
        z.object({
          source: z.literal("smartthings"),
          deviceId: smartThingsDeviceIdSchema,
          ...tileBase,
        }),
      ]),
    )
    .max(500)
    .refine(
      (items) =>
        new Set(items.map((i) => `${i.source}:${i.deviceId}:${i.endpointId}`))
          .size === items.length,
      "같은 타일이 중복되었습니다.",
    ),
});

export const groupOrderSchema = z.object({
  ids: z.array(groupIdSchema).max(200),
});
