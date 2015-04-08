import debug from 'debug';
import * as ns from './namespace';
import * as request from './request';

debug = debug('dav:webdav');

/**
 * @param {String} objectUrl url for webdav object.
 * @param {String} objectData webdav object data.
 */
export function createObject(objectUrl, objectData, options) {
  var req = request.basic({ method: 'PUT', data: objectData });
  return options.xhr.send(req, objectUrl, { sandbox: options.sandbox });
}

export function updateObject(objectUrl, objectData, etag, options) {
  var req = request.basic({ method: 'PUT', data: objectData, etag: etag });
  return options.xhr.send(req, objectUrl, { sandbox: options.sandbox });
}

export function deleteObject(objectUrl, etag, options) {
  var req = request.basic({ method: 'DELETE', etag: etag });
  return options.xhr.send(req, objectUrl, { sandbox: options.sandbox });
}

export function syncCollection(collection, options) {
  let syncMethod;
  if ('syncMethod' in options) {
    syncMethod = options.syncMethod;
  } else if (collection.reports &&
             collection.reports.indexOf('syncCollection') !== -1) {
    syncMethod = 'webdav';
  } else {
    syncMethod = 'basic';
  }

  if (syncMethod === 'webdav') {
    debug('rfc 6578 sync.');
    return options.webdavSync(collection, options);
  } else {
    debug('basic sync.');
    return options.basicSync(collection, options);
  }
}

/**
 * @param {dav.DAVCollection} collection to fetch report set for.
 */
export async function supportedReportSet(collection, options) {
  debug('Checking supported report set for collection at ' + collection.url);
  var req = request.propfind({
    props: [ { name: 'supported-report-set', namespace: ns.DAV } ],
    depth: 1,
    mergeResponses: true
  });

  let response = await options.xhr.send(req, collection.url, {
    sandbox: options.sandbox
  });

  return response.props.supportedReportSet;
}

export async function isCollectionDirty(collection, options) {
  if (!collection.ctag) {
    debug('Missing ctag.');
    return false;
  }

  debug('Fetch remote getctag prop.');
  var req = request.propfind({
    props: [ { name: 'getctag', namespace: ns.CALENDAR_SERVER } ],
    depth: 0
  });

  let responses = await options.xhr.send(req, collection.account.homeUrl, {
    sandbox: options.sandbox
  });

  let response = responses.filter(response => {
    // Find the response that corresponds to the parameter collection.
    return collection.url.indexOf(response.href !== -1);
  })[0];

  if (!response) {
    throw new Error('Could not find collection on remote. Was it deleted?');
  }

  debug('Check whether cached ctag matches remote.');
  return collection.ctag !== response.props.getctag;
}