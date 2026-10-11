import { redirect } from "next/navigation";

// 그룹 관리는 설정 탭으로 옮겼다. 예전 주소로 들어오면 설정으로 보낸다.
export default function GroupsPage() {
  redirect("/settings");
}
