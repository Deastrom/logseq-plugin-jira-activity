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
          let activityStreamUrl = `${logseq.settings?.host}activity`
          activityStreamUrl += "?maxResults=200"
          const reaccount_id = new RegExp("&streams=account-id.*", "g")
          if (reaccount_id.test(logseq.settings?.account_id)) {
            activityStreamUrl += logseq.settings?.account_id
          }
          const rekey = new RegExp("&streams=key.*", "g")
          if (rekey.test(logseq.settings?.key)) {
            activityStreamUrl += logseq.settings?.key
          }
          const reactivity = new RegExp("&issues=activity.*", "g")
          if (reactivity.test(logseq.settings?.activity)) {
            activityStreamUrl += logseq.settings?.activity
          }
          const reissue_type = new RegExp("&issues=issue_type.*", "g")
          if (reissue_type.test(logseq.settings?.issue_type)) {
            activityStreamUrl += logseq.settings?.issue_type
          }
          const reproduct_category = new RegExp("&issues=project_category.*", "g")
          if (reproduct_category.test(logseq.settings?.project_category)) {
            activityStreamUrl += logseq.settings?.project_category
          }
          activityStreamUrl += `&streams=update-date+BETWEEN+${afterDate.valueOf()}+${beforeDate.valueOf()}`
          activityStreamUrl += "&os_authType=basic"
          activityStreamUrl += `&title=Journal_Feed_${moment.now().valueOf()}`
          console.info(activityStreamUrl)
          const headers = new Headers()
          headers.set('Authorization', 'Basic ' + encode(logseq.settings?.username + ":" + logseq.settings?.password));
          const activitystreamxml = await fetch(activityStreamUrl, {
            method: 'GET',
            headers: headers
          }).then(function(response) {
            return response.text();
          })
          const xmlObj = xmlParser.parse(activitystreamxml)
          for await (const thisEntry of xmlObj.feed.entry) {
            const title:string = thisEntry.title
            const reAuthor = new RegExp(`<a.*class="activity-item-user activity-item-author">${thisEntry.author.name}</a>`, "gm")
            const reAssigneeOpen = new RegExp(`'<a.*class="activity-item-user">`, "gm")
            const reAssigneeClose = new RegExp(`</a>'`, "gm")
            const reSpaces = new RegExp("\\s\\s+", "gm")
            const value = title.replace(reAuthor,`[[${thisEntry.author.name}]]`).replace(reAssigneeOpen, '[[').replace(reAssigneeClose, ']]').replace(reSpaces, ' ')
            const newblock = await logseq.Editor.insertBlock(
              currentBlock.uuid,
              value
            )
            if (newblock !== null && thisEntry.content !== undefined) {
              const newblockchild = await logseq.Editor.insertBlock(
                newblock.uuid,
                thisEntry.content
              )
              if (newblockchild !== null){
                await logseq.Editor.setBlockCollapsed(newblock.uuid, true)
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
