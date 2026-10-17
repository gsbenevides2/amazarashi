import { getChrome } from "../../lib/api";
import HeaderView from "./HeaderView";

async function Data() {
  const { menu, socials } = await getChrome();
  return <HeaderView menu={menu} socials={socials} />;
}

export default Data;
