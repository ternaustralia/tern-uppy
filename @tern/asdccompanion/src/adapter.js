import * as mime from "mime-types";

/**
 * Return path to use to access this time.
 * result needs to be url encoded so that API can parse it as path parameter even if it has sub paths included.
 *
 * @param {*} item Item as returned by WebODM API
 * @returns uri encoded path to item (relative to WebODM API root)
 */
function getRequestPath(item) {
  let path = null;
  if (Object.prototype.hasOwnProperty.call(item, "tasks")) {
    // it's a project (as returned by /projects endpoint)
    // return paths are to list project contents (tasks)
    path = `${item.id}/tasks/`;
  } else {
    // it's a task ( as returned by /projects/<pid>/tasks/ endpoint)
    // returned paths are to list tasks contents (assets)
    path = `${item.project}/tasks/${item.id}/`;
  }
  return encodeURIComponent(path);
}

/**
 * Guess mimetype based on file extension.
 *
 * @param {*} name file name (may be a full path)
 * @returns detected mime type or fallback application/octet-stream
 */
function getMimeType(name) {
  let mimeType = mime.lookup(name);
  if (!mimeType) {
    mimeType = "application/octet-stream";
  }
  return mimeType;
}

/**
 * convert object returned by WebODM API into a structure Uppy UI can work with.
 *
 * @param {*} res WebODM API return value (from projects or tasks endpoint)
 * @returns object for Uppy UI
 */
export function adaptData(res) {
  /** Projects: /api/projects/
   *   [ {id: 512, created_at:'2022-02-01T03:16:14.126476Z',
   *       descirption: 'project test to test download and upload ',
   *       name: "testproject2",
   *       permissions: ["view", "delete", "chaneg", "add"],
   *       tasks; [ '<uuid>' ],
   *     }
   *   ]
   *
   *  Task: /api/projects/<pid>/tasks/
   *   [ { id: "", project: num, name: "", available_assets: ["all.zip"], created_at: "", }]
   *
   *  Assets: /api/projects/<pid>/tasks/<tid>/
   *    structure as above but single object ... and probably look at available_assets ???
   */
  // build initial structure.
  const data = {
    // TODO: document
    username: null,
    // placeholder for folder contents.
    items: [],
    // used in case API requires paging
    nextPagePath: null,
    // searchedFor: ...
    // nextPageQuery: ...
  };

  // if res is not an array then res is a single task with asset details
  // => return items.available_assets as files
  const items = res;
  if (Array.isArray(items)) {
    // It's an array, so we only have a list of projects or tasks which represent folders.
    items.forEach((item) => {
      data.items.push({
        isFolder: true,
        icon: "folder",
        name: item.name || item.description,
        mimeType: null,
        id: item.id,
        // TODO: can we do thumbnails via WebODM API ?
        // thumbnail: isFolder ? item.cover_photo.urls.thumb : item.urls.thumb,
        // thumbnail: companion.buildURL(getItemThumbnailUrl(item), true),
        // thumbnail:  /dropbox/thumbnail/${getItemRequestPath(item)}` ... use thumbnail api
        requestPath: getRequestPath(item),
        modifiedDate: item.created_at,
        size: null,
        // TODO: additional data my UIPlugin wants to use. (see drive plugin)
        custom: {},
      });
    });
  } else {
    // it's a task listing (it's all assets in here)
    items.available_assets.forEach((asset) => {
      const mimeType = getMimeType(asset);
      data.items.push({
        isFolder: false,
        icon: "file", // support: file, folder, video or any kind of url
        name: asset,
        mimeType,
        id: asset,
        requestPath: encodeURIComponent(`${items.project}/tasks/${items.id}/download/${asset}`),
        // unfortunately WebDOM does not report size of assets
        size: null,
      });
    });
  }

  return data;
}
