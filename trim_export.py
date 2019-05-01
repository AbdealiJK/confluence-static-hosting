import os
import sys
import xml.etree.ElementTree as ET  # noqa: N814

import click


def _pagenode_fetch_id(node):
    return node.findtext('id')


def _pagenode_fetch_original_page_id(node):
    original_page_id = node.findtext('property[@name="originalVersionId"]')
    if original_page_id is None:  # if no original page id, it is the original page.
        original_page_id = node.findtext('id')
    return original_page_id


def _pagenode_fetch_title(node):
    return node.findtext('property[@name="title"]')


def _pagenode_fetch_version(node):
    return node.findtext('property[@name="version"]')


def _commentnode_delete(entities, node):
    # Delete the page node
    comment_id = node.findtext('id')
    entities.getroot().remove(node)

    # Delete the customContent related to a comment. Example:
    # - The highlighted portion of the body for the comment popup to open
    custom_content = node.find('collection[@name="customContent"]')
    if custom_content:
        custom_content_obj_ids = {
            i.findtext('id') for i in custom_content.findall('element[@class="CustomContentEntityObject"]')}
        for cco in entities.getroot().findall('object[@class="CustomContentEntityObject"]'):
            if cco.findtext('id') in custom_content_obj_ids:
                # When deleting a CCO - delete the bodyContent for it too
                entities.getroot().remove(cco)

    # Delete the BodyContent related to this page
    body_contents = entities.getroot().findall('object[@class="BodyContent"]')
    for bc in body_contents:
        bc_comment = bc.find('property[@class="Comment"]')
        if bc_comment and bc_comment.findtext('id') == comment_id:
            entities.getroot().remove(bc)
        if custom_content:
            bc_cco = bc.find('property[@class="CustomContentEntityObject"]')
            if bc_cco and bc_cco.findtext('id') in custom_content_obj_ids:
                entities.getroot().remove(bc)


def _pagenode_delete(entities, node):
    # Delete the page node
    page_id = _pagenode_fetch_id(node)
    entities.getroot().remove(node)

    # Delete the User2ContentRelationEntity related to this page
    user_content_relations = entities.getroot().findall('object[@class="User2ContentRelationEntity"]')
    for ucr in user_content_relations:
        ucr_page = ucr.find('property[@class="Page"]')
        if ucr_page and ucr_page.findtext('id') == page_id:
            entities.getroot().remove(ucr)

    # Delete the BodyContent related to this page
    body_contents = entities.getroot().findall('object[@class="BodyContent"]')
    for bc in body_contents:
        bc_page = bc.find('property[@class="Page"]')
        if bc_page and bc_page.findtext('id') == page_id:
            entities.getroot().remove(bc)

    # Delete the OutgoingLinks related to this page
    links = entities.getroot().findall('object[@class="BodyContent"]')
    for link in links:
        link_page = link.find('property[@class="Page"]')
        if link_page and link_page.findtext('id') == page_id:
            # link_id = link.findtext('id')
            # NOTE: The outgoing link could be referened in a page.
            #       That link will be broken as that ID is being deleted here
            entities.getroot().remove(link)



@click.command()
@click.argument(
    'exportpath', required=True,
    type=click.Path(dir_okay=True, file_okay=False, writable=True))
def main(exportpath):
    """
    Trim the given entities file provided to have only the latest pages.
    """
    entities = ET.parse(os.path.join(exportpath, 'entities.xml'))

    # TRIM: Remove all user information
    for user_node in entities.getroot().findall('object[@class="ConfluenceUserImpl"]'):
        print('Deleting ConfluenceUserImpl id={}'.format(user_node.findtext('id')))
        entities.getroot().remove(user_node)

    # TRIM: Remove all notifications
    for notif_node in entities.getroot().findall('object[@class="Notification"]'):
        print('Deleting Notification id={}'.format(notif_node.findtext('id')))
        entities.getroot().remove(notif_node)

    # TRIM: Remove all User2ContentRelationEntity - relates how a user is related to a content
    for user_content_node in entities.getroot().findall('object[@class="User2ContentRelationEntity"]'):
        print('Deleting User2ContentRelationEntity id={}'.format(user_content_node.findtext('id')))
        entities.getroot().remove(user_content_node)

    # TRIM: Remove all Label and Labelling objects
    for label_node in entities.getroot().findall('object[@class="Label"]'):
        print('Deleting Label id={}'.format(label_node.findtext('id')))
        entities.getroot().remove(label_node)
    for labelling_node in entities.getroot().findall('object[@class="Labelling"]'):
        print('Deleting Labelling id={}'.format(labelling_node.findtext('id')))
        entities.getroot().remove(labelling_node)

    # TRIM: Remove likes
    for like_node in entities.getroot().findall('object[@class="LikeEntity"]'):
        print('Deleting LikeEntity id={}'.format(like_node.findtext('id')))
        entities.getroot().remove(like_node)

    # TRIM: Remove permissions for the space
    for space_perm_node in entities.getroot().findall('object[@class="SpacePermission"]'):
        print('Deleting SpacePermission id={}'.format(space_perm_node.findtext('id')))
        entities.getroot().remove(space_perm_node)

    # TRIM: Remove comments
    for comment_node in entities.getroot().findall('object[@class="Comment"]'):
        print('Deleting Comment id={}'.format(comment_node.findtext('id')))
        _commentnode_delete(entities, comment_node)

    # TRIM: Keep only current pages
    # The contentStatus is present in the XML. It takes values: CURRENT, DRAFT, HISTORICAL, TRASHED
    # Only th CURRENT status is actually useful to be shown as the current version of the page
    # https://docs.atlassian.com/atlassian-confluence/5.9.9/com/atlassian/confluence/api/model/content/ContentStatus.html
    for page_node in entities.getroot().findall('object[@class="Page"]'):
        page_status = page_node.findtext('property[@name="contentStatus"]')
        if page_status:
            page_status = page_status.strip()
            if page_status.lower() != 'current':  # Delete if not current.
                print('Deleting non-current page id={} (status={})'
                      .format(_pagenode_fetch_id(page_node), page_status))
                _pagenode_delete(entities, page_node)

    # TRIM: Keep only current CustomContentEntityObject
    for cco_node in entities.getroot().findall('object[@class="CustomContentEntityObject"]'):
        cco_status = cco_node.findtext('property[@name="contentStatus"]')
        if cco_status:
            cco_status = cco_status.strip()
            if cco_status.lower() != 'current':  # Delete if not current.
                print('Deleting non-current CustomContentEntityObject id={} (status={})'
                      .format(_pagenode_fetch_id(cco_node), cco_status))
                _pagenode_delete(entities, cco_node)

    # TRIM: Remove older versions of a page - keep latest and initial
    all_page_versions = entities.getroot().findall('object[@class="Page"]')
    all_pages = {}
    for page_node in all_page_versions:
        original_page_id = _pagenode_fetch_original_page_id(page_node)
        if original_page_id not in all_pages:
            all_pages[original_page_id] = page_node
        else:
            known_page = all_pages[original_page_id]
            if _pagenode_fetch_version(page_node) > _pagenode_fetch_version(known_page):
                all_pages[original_page_id] = page_node
    for page_node in all_page_versions:
        original_page_id = _pagenode_fetch_original_page_id(page_node)
        wanted_page_node = all_pages[original_page_id]
        if (_pagenode_fetch_id(page_node) != _pagenode_fetch_id(wanted_page_node) and
                _pagenode_fetch_id(page_node) not in all_pages):
            print('Deleting older page id={} (version={}, wanted_version={})'
                  .format(_pagenode_fetch_id(page_node), _pagenode_fetch_version(page_node),
                          _pagenode_fetch_version(wanted_page_node)))
            _pagenode_delete(entities, page_node)

    entities.write(os.path.join(exportpath, 'entities.xml'))


if __name__ == '__main__':
    sys.exit(main())
