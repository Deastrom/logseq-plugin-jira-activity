import "@logseq/libs";

import { logseq as PL } from "../package.json";

//const pluginId = PL.id;

function main() {
  // console.info(`#${pluginId}: MAIN`);
  console.log('all clean')
}

logseq.ready(main).catch(console.error);
