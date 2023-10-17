import "@logseq/libs";
// @ts-ignore
import moment from "moment";
// @ts-ignore
import { encode } from "base-64";
import { XMLParser } from "fast-xml-parser";
// @ts-ignore
import { settings } from './settings';

import { logseq as PL } from "../package.json";
// @ts-ignore
const pluginId = PL.id;

function main() {
  logseq.useSettingsSchema(settings);
  logseq.Editor.registerSlashCommand(
    'Update Jira Activity',
    async () => { await updateJiraActivity(); }
  )
  console.info(`#${pluginId}: Loaded`)
}

async function updateJiraActivity() {
  try {
    console.info('Entered updateJiraActivity()')
    const xmlParser = new XMLParser();
    const currentBlock = await logseq.Editor.getCurrentBlock();
    if (currentBlock) {
      const currentPage = await logseq.Editor.getPage(currentBlock.page.id)
      if (currentPage) {
        if (currentPage.journalDay !== undefined) {
          logseq.Editor.updateBlock(currentBlock.uuid, "Appending Jira Activities from Stream Url...")
          const afterDate = moment(`${currentPage.journalDay}`, "YYYYMMDD")
          const beforeDate = moment(`${currentPage.journalDay}`, "YYYYMMDD").subtract(1, 'millisecond').add(1, 'day')
          for await (let activityStreamUrl of logseq.settings?.activityStreams.split('\n')) {
            activityStreamUrl += `&streams=update-date+BETWEEN+${afterDate.valueOf()}+${beforeDate.valueOf()}`
            console.info(activityStreamUrl)
            const headers = new Headers()
            headers.set('Authorization', 'Basic ' + encode(logseq.settings?.username + ":" + logseq.settings?.password));
            const activitystreamxml = await fetch(activityStreamUrl, {
              method: 'GET',
              headers: headers
            }).then(function (response) {
              return response.text();
            })
            const xmlObj = xmlParser.parse(activitystreamxml)
            if (xmlObj.feed.entry !== undefined) {
              let entries
              if (xmlObj.feed.entry.length) {
                entries = xmlObj.feed.entry
              } else {
                entries = [xmlObj.feed.entry]
              }
              for await (const thisEntry of entries) {
                const title: string = thisEntry.title
                const reSpaces = new RegExp("\\s\\s+", "gm")
                const reApostrophe = new RegExp('&#39;', "gm")
                const rePriority = new RegExp('\'#(.*?)\'', "gm")
                let value = title
                  .replace(reSpaces, ' ')
                  .replace(reApostrophe, '\'')
                  .replace(rePriority, '$1')
                  .replace("'<", "<")
                  .replace(">'", ">")
                for (const match_and_tag of logseq.settings?.match_and_tag.split('\n')) {
                  const match = match_and_tag.split('=')[0]
                  const tag = match_and_tag.split('=')[1]
                  const matchReg = new RegExp(match.split('/')[1], match.split('/')[2])
                  if (value.match(matchReg)) {
                    value += ` #[[${tag}]]`
                  }
                }
                const newblock = await logseq.Editor.insertBlock(
                  currentBlock.uuid,
                  value
                )
                if (newblock !== null && thisEntry.content !== undefined && thisEntry.content.length > 0) {
                  let value = thisEntry.content
                    .replace(reSpaces, ' ')
                    .replace(reApostrophe, '\'')
                  for (const match_and_tag of logseq.settings?.match_and_tag.split('\n')) {
                    const match = match_and_tag.split('=')[0]
                    const tag = match_and_tag.split('=')[1]
                    const matchReg = new RegExp(match.split('/')[1], match.split('/')[2])
                    if (value.match(matchReg)) {
                      value += ` #[[${tag}]]`
                    }
                  }
                  const newblockchild = await logseq.Editor.insertBlock(
                    newblock.uuid,
                    value
                  )
                }
              }
            }
          }
          logseq.Editor.updateBlock(currentBlock.uuid, "Jira Activity Feed")
        } else {
          logseq.Editor.updateBlock(currentBlock.uuid, "Update Jira Activity can only be called from a journal page")
        }
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error('logseq-plugin-gitlab-events', e.message)
    }
  }
}

logseq.ready(main).catch(console.error);
