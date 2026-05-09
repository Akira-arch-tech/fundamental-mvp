import { redirect } from "next/navigation";

/** 旧「外链工作台」入口统一进入内部 AI 编辑器 */
export default function AiWorkbenchRedirectPage() {
  redirect("/b/ai-editor");
}
