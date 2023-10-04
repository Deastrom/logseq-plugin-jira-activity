import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'

export const settings: SettingSchemaDesc[] = [
    {
        key: "username",
        title: "Username",
        description: "Username used in Basic Auth to get RSS feed xml file (if there was a better way from Jira, I'd do it)",
        type: "string",
        default: null,
    },
    {
        key: "password",
        title: "API Key",
        description: "API Key used in Basic Auth to get RSS feed xml file (if there was a better way from Jira, I'd do it)",
        type: "string",
        default: null,
    },
    {
        key: "activityStreams",
        title: "Jira Activity Streams",
        description: "List of Jira Activity Stream urls copied from Dashboard",
        inputAs: "textarea",
        type: "string",
        default: null,
    },
    {
        key: "match_and_tag",
        title: "Match and Tag",
        description: "A list of regex and tags, each separated with an equals (=).",
        inputAs: "textarea",
        type: "string",
        default: null,
    },
]