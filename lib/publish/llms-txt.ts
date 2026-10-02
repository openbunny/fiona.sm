import { posts } from "@/lib/blog/posts"
import { securityPolicyHref } from "@/lib/publish/security-policy"
import { securityTxtHref } from "@/lib/publish/security-txt"
import { joinOrigin } from "@/lib/publish/url"
import { wkdKeyHref, wkdPolicyHref } from "@/lib/publish/wkd"
import { site } from "@/lib/site/site"

export type LlmsTxtInput = {
  readonly name: string
  readonly email: string
  readonly fingerprint: string
  readonly algorithm: string
  readonly siteOrigin: string
  readonly publicKeyHref: string
  readonly statementHref: string
  readonly archiveHrefs: ReadonlyArray<string>
}

export function buildLlmsTxt(input: LlmsTxtInput): string {
  const url = (href: string): string => joinOrigin(input.siteOrigin, href)
  const lines = [
    `# ${input.name}`,
    "",
    `> personal site for ${input.name}, with a blog and a pgp key canary at ${url("/canary")}.`,
    "",
    `${input.name} publishes a clearsigned statement asserting sole control of one openpgp key. the live document is the signed statement, not this page: verify ${input.statementHref} against the public key at ${input.publicKeyHref}.`,
    "",
    `- Name: ${input.name}`,
    `- Email: ${input.email}`,
    `- Fingerprint: ${input.fingerprint}`,
    `- Key: ${input.algorithm}`,
    "",
    "## pages",
    "",
    `- [home](${url("/")}): ${input.name}, with a link to the canary`,
    ...(posts.length > 0
      ? [
          `- [blog](${url("/blog")}): posts, most recent first`,
          `- [post verification](${url("/blog/verify-posts")}): what the post content manifest attests, and how to check it`,
          `- [post content manifest](${url("/posts.asc")}): sha-256 of each published post's normalised article text, paired with its slug`,
        ]
      : []),
    `- [canary](${url("/canary")}): key canary, fingerprint, signed statement, public key`,
    `- [privacy](${url("/privacy")}): what this site records about a visit, and what it does not`,
    ...(posts.length > 0
      ? [
          `- [feed](${url(site.feedPath)}): atom feed of posts, most recent first`,
          `- [post content manifest](${url("/posts.asc")}): clearsigned sha-256 hashes of published post text`,
        ]
      : []),
    `- [public key](${url(input.publicKeyHref)}): openpgp public key (${input.algorithm})`,
    `- [signed statement](${url(input.statementHref)}): current clearsigned statement`,
    `- [disclosure policy](${url(securityPolicyHref)}): where a vulnerability disclosure goes, what is in scope, and the rules`,
    `- [security.txt](${url(securityTxtHref)}): clearsigned RFC 9116 contact file, naming the disclosure policy above`,
    `- [web key directory key](${url(wkdKeyHref(input.email))}): the public key in binary form, for gpg --locate-keys ${input.email}`,
    `- [web key directory policy](${url(wkdPolicyHref)}): the policy flags file the direct method requires`,
  ]

  if (input.archiveHrefs.length > 0) {
    lines.push("", "## previous statements", "")
    for (const href of input.archiveHrefs) {
      const date = href.replace("/canary/", "").replace(".asc", "")
      lines.push(`- [${date}](${url(href)}): statement signed on ${date}`)
    }
  }

  lines.push("")
  return lines.join("\n")
}
