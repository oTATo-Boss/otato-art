import { UpdatesPage } from "@/shell/UpdatesPage";
import { siteMetadata } from "@/lib/metadata";

export const metadata = siteMetadata("en", "Updates", "/updates");

export default function Page() {
  return <UpdatesPage lang="en" />;
}
