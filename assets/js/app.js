$docData = null;

$(function() {
    console.log("Document loaded. Loading the XML!");
    $.ajax({
        type: "get",
        url: "./assets/export/entities.xml",
        dataType: "xml",
        success: function(data) {
            $docData = $(data).children('hibernate-generic');
            console.log("XML loaded");
            console.log(getPagesList())
        },
        error: function(xhr, status) {
            console.log("FAILED to load XML: ", status);
        }
    });
});

function _getAllPages() {
    var $allPages = $docData.children('object[class="Page"]')
    return $allPages.filter((iel, el) => {
        return $(el).children('property[name="contentStatus"]').text().trim().toLowerCase() === 'current'
    })
}

function _getNodeId(node) {
    return $(node).children('id').text().trim()
}

function _getNodeTitle(node) {
    return $(node).children('property[name="title"]').text().trim()
}

function _getNodeVersion(node) {
    return parseInt($(node).children('property[name="version"]').text().trim())
}

function _getNodeOriginalVersionId(node) {
    $node = $(node)
    originalVersionId = $node.children('property[name="originalVersionId"]').text().trim()
    return originalVersionId ? originalVersionId : _getNodeId($node)
}

function _getInfoRecursively(nodes, fn) {
    // Recurse on the `nodes` left to right and get the value where the `fn` returns a valid value
    for (var i = 0; i < nodes.length; i++) {
        var ret = fn(nodes[i])
        if (ret) {
            return ret
        }
    }
}

function _getGroupedPageVersions(pages) {
    // Get the latest page versions by mapping it to the originalVersionId.
    pageVersions = {} // {originalVersionId: [pageVersions ...]}
    pages.each((iel, el) => {
        $el = $(el)
        originalVersionId = _getNodeOriginalVersionId($el)
        if (! pageVersions.hasOwnProperty(originalVersionId)) {
            pageVersions[originalVersionId] = []
        }
        pageVersions[originalVersionId].push($el[0])
    })
    // Sort all the provided pages by version
    Object.keys(pageVersions).forEach(key => {
        pageVersions[key].sort(_getNodeVersion)
    })
    return pageVersions
}

function getPagesList() {
    var $allPages = _getAllPages()
    allPageVersions = _getGroupedPageVersions($allPages)

    return Object.keys(allPageVersions).map(key => {
        $page = $(allPageVersions[key][allPageVersions[key].length - 1])
        var pageVersions = allPageVersions[_getNodeOriginalVersionId($page)]
        var parentVersionId = _getInfoRecursively(pageVersions, (pageVersion) => {
            return $(pageVersion).children('property[name="parent"]').children('id').text().trim()
        })
        if (parentVersionId) {
            var foundParentPages = $allPages.filter((iel, el) => _getNodeId(el) === parentVersionId)
            if (foundParentPages.length === 1) {
                parentVersions = allPageVersions[_getNodeOriginalVersionId(foundParentPages[0])];
                parentId = _getNodeId(parentVersions[parentVersions.length - 1])
            } else {
                console.log(`Found ${parentVersions.length} parentVersions for page ${$page}`)
                parentId = null;
            }
        } else {
            parentId = null;
        }
        return {
            id: _getNodeId($page),
            title: _getNodeTitle($page),
            parentId: parentId
        };
    });
}

function getPage(pageId) {
    pageId = pageId.toString()
    var $allPages = _getAllPages()
    var pages = $allPages.filter((ix, x) => $(x).children('id').text().trim() === pageId)
    if (pages.length === 0) {
        return;
    }
    var $page = $(pages[0])

    // Get body from page information
    var bodyContentIds = $page.children('collection[name="bodyContents"]').map((iel, el) => {
        return $(el).find('element.BodyContent id').text().trim()
    }).toArray()
    var bodyContentObjs = $docData.children('object[class="BodyContent"]').filter((iel, el) => {
        return bodyContentIds.indexOf($(el).children('id').text().trim()) !== -1
    });
    if (bodyContentObjs.length !== 1) {
        console.log(`Found ${bodyContentObjs.length} bodyContents for page ${$page}`)
    }
    if (bodyContentObjs.length === 1) {
        var $bodyContent = $(bodyContentObjs[0])
        var body = $bodyContent.children('property[name="body"]').text()
    }

    // Get attachments from page information
    var pageAttachments = $page.find('collection[name="attachments"] element.Attachment id')
    var attachmentIds = pageAttachments.map((iel, el) => $(el).text()).toArray()
    var attachments = $docData.children('object[class="Attachment"]').filter((iel, el) => {
        return attachmentIds.indexOf(_getNodeId(el)) !== -1
    }).toArray();
    
    return {
        id: _getNodeId($page),
        title: $page.children('property[name="title"]').text().trim(),
        body: body,
        attachments: attachments.map(el => {
            $el = $(el)
            return {
                id: _getNodeId($el),
                title: _getNodeTitle($el),
                version: _getNodeVersion($el),
                url: `/${_getNodeId($page)}/${_getNodeId($el)}/${_getNodeVersion($el)}`
            }
        })
    }
}

function createPageHierarchy(pages) {
    parents = [...new Set(Object.values(pages).map(el => el.parentId))]
}
