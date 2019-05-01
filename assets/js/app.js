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

function _getPageOriginalVersionId(page) {
    $page = $(page)
    originalVersionId = $page.children('property[name="originalVersionId"]').text().trim()
    if (! originalVersionId) {
        originalVersionId = $page.children('id').text().trim()
    }
    return originalVersionId
}

function _getPageId(page) {
    return $(page).children('id').text().trim()
}

function _getPageVersion(page) {
    return parseInt($(page).children('property[name="version"]').text().trim())
}

function getPagesList() {
    var $allPages = $docData.children('object[class="Page"]');

    // Get the latest page versions by mapping it to the originalVersionId.
    latestPageVersions = {} // {originalVersionId: latestPageVersion}
    $allPages.each((iel, el) => {
        $el = $(el)
        originalVersionId = _getPageOriginalVersionId($el)
        if (! latestPageVersions.hasOwnProperty(originalVersionId)) {
            latestPageVersions[originalVersionId] = $el;
        } else {
            if (_getPageVersion($el) > _getPageVersion(latestPageVersions[originalVersionId])) {
                latestPageVersions[originalVersionId] = $el;
            }
        }
    })
    console.log(latestPageVersions)

    return Object.values(latestPageVersions).map(el => {
        $el = $(el)
        // debugger;
        parentOriginalVersionId = $el.children('property[name="parent"]').children('id').text().trim()
        if (! parentOriginalVersionId) {
            var initialElId = $el.children('property[name="originalVersionId"]').text().trim()
            $initialPage = $allPages.filter((ix, x) => $(x).children('id').text().trim() == initialElId)
            if ($initialPage.length === 0) {
                parentOriginalVersionId = '';
            } else {
                parentOriginalVersionId = $initialPage.children('property[name="parent"]').children('id').text().trim()
            }
        }
        return {
            id: $el.children('id').text().trim(),
            title: $el.children('property[name="title"]').text().trim(),
            originalVersionId: originalVersionId,
            parentOriginalVersionId: parentOriginalVersionId
        };
    });
}

function getPage(pageId) {
    var $allPages = $docData.children('object[class="Page"]');
    var pages = $allPages.filter((ix, x) => $(x).children('id').text().trim() == pageId)
    if (pages.length === 0) {
        return;
    }
    var $page = $(pages[0])
    var bodyContentIds = $page.children('collection[name="bodyContents"]').map((iel, el) => {
        return $(el).find('element.BodyContent id').text().trim()
    }).toArray()
    debugger;
    var bodyContents = $docData.children('object[class="BodyContent"]').filter((iel, el) => {
        return bodyContentIds.indexOf($(el).children('id').text().trim()) !== -1
    });
    if (bodyContents.length !== 1) {
        console.log(`Found ${bodyContents.length} bodyContents for page ${$page}`)
    }
    if (bodyContents.length === 1) {
        var $bodyContent = $(bodyContents[0])
        var body = $bodyContent.children('property[name="body"]').text()
    }
    return {
        title: $page.children('property[name="title"]').text().trim(),
        body: body
    }
}