import { UpdatesPage } from "@/shell/UpdatesPage";
import { siteMetadata } from "@/lib/metadata";

export const metadata = siteMetadata("zh", "更新记录", "/updates");

export default function Page() {
  return <UpdatesPage lang="zh" />;
}
