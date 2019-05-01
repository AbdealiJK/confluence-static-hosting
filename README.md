# Confluence Static Hosting

This project aims to take a Confluence website and host is staticly independent of Confluence.
This is a very useful method of deploying documentation and webpages which can be developed
using Confluence's rich editoing functionality - and exporting as a static website.

Similar Alternatives:
 - `HTML Export in Confluence` - This is useful for simple websites. It is not rich in metadata,
   nor does it help in structuring the data differently. Making it difficult to use with good themeing.
 - `Instant Websites for Confluence` - This is useful for hosting a confluence publicly. The issue here
   is the static website is hosted on the S3 which is not controlled by us, and the website HAS to be
   public. [marketplace](https://marketplace.atlassian.com/apps/1214121/instant-websites-for-confluence)
 - `Native Confluence Support` - This is under discussion in the JIRA ticket
   [CONFSERVER-18265](https://jira.atlassian.com/browse/CONFSERVER-18265)


# Usage
1. Take a XML dump from confluence
2. Put the folder into `assets/export` so that the following paths exist:
  - `assets/export/entities.xml`
  - `assets/export/exportDescriptor.properties`
  - `assets/export/attachments` (if any)
3. Run a simple http server form the repo root
  - If you have python, this can be done with: `python -m http.server 9000`
4. Browse to `localhost:9000` in your browser

For optimization, a trimming function has been made to trim the exported bundle and remove
information not useful for static hosting. This can be run with `python trim_export.py assets/export`
