import * as utils from '../src/utils';
import { parse as parseUrl } from '../src/url';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'clickagy';
const ENDPOINT = 'https://aorta.clickagy.com/rtb/openrtb/bid?ch=183';
const USER_SYNC = 'https://aorta.clickagy.com/pixel.gif?ch=183';
const COOKIE = 'cb';

function getTopWindowLocation (bidderRequest) {
  let url = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer;
  return parseUrl(config.getConfig('pageUrl') || url, { decodeSearchAsString: true });
}

function getTopWindowReferrer () {
  const w = utils.getWindowTop();
  return (w && w.document && w.document.referrer) ? w.document.referrer : '';
}

function parseSizes(sizes) {
  return utils.parseSizesInput(sizes).map(size => {
    let [ width, height ] = size.split('x');
    return {
      w: parseInt(width),
      h: parseInt(height)
    };
  });
}

function getSizes(bid) {
  return parseSizes(utils.deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
}

function _prepareImp(bid, bidderRequest) {
  const topLocation = getTopWindowLocation(bidderRequest);
  const size = getSizes(bid)[0]
  const imp = {
    id: bid.bidId,
    secure: topLocation.protocol.indexOf('https') === 0 ? 1 : 0,
    banner: {
      w: size.w,
      h: size.h,
      topframe: utils.inIframe() ? 0 : 1,
    },
    tagid: bid.params.tagid ? bid.params.tagid.toString() : '',
  };

  const bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
  if (bidfloor) {
    imp.bidfloor = parseFloat(bidfloor);
  }

  return imp;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [], // short code and customer aliases
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (!bid || !bid.params || !bid.params.publisherId || !utils.checkCookieSupport() || !utils.cookiesAreEnabled()) {
      return false;
    }

    return true;
  },

  buildRequests: function (bids, bidderRequest) {
    let clickagyImps = [];
    utils._each(bids, function(bid) {
      clickagyImps.push(
        _prepareImp(bid, bidderRequest)
      )
    })
    const request = {
      id: bids[0].bidId,
      at: 2,
      imp: clickagyImps,
      site: this._prepareSite(bids[0], bidderRequest),
      device: this._prepareDevice(),
      user: this._prepareUser()
    };
    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(request)
    };
  },

  interpretResponse: function (serverResponse) {
    const body = serverResponse.body;

    let responses = [];
    if (serverResponse &&
      body &&
      body.seatbid &&
      body.seatbid.length > 0 &&
      body.seatbid[0].bid &&
      body.seatbid[0].bid.length > 0) {
      body.seatbid[0].bid.map(bid => {
        let creative = bid.adm.replace(/\${AUCTION_PRICE:B64}/g, window.btoa(bid.price)).replace(/{winning_price}/g, bid.price);
        responses.push({
          requestId: bid.impid,
          cpm: parseFloat(bid.price),
          width: parseInt(bid.w),
          height: parseInt(bid.h),
          creativeId: bid.crid || bid.id,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: creative,
          ttl: 360
        });
      });
    }
    return responses;
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = []
    if (syncOptions.pixelEnabled && serverResponses && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: USER_SYNC
      });
    }
    return syncs;
  },

  _prepareSite: function (bid, bidderRequest) {
    const topLocation = getTopWindowLocation(bidderRequest);
    return {
      publisher: {
        id: bid.params.publisherId.toString(),
        domain: topLocation.hostname,
      },
      ref: getTopWindowReferrer(),
      domain: topLocation.hostname,
      page: topLocation.href,
    }
  },
  _prepareDevice: function () {
    const w = utils.getWindowTop() || window;
    return {
      dnt: utils.getDNT() ? 1 : 0,
      ua: w.navigator.userAgent,
      language: (w.navigator.language || w.navigator.browserLanguage || w.navigator.userLanguage || w.navigator.systemLanguage),
      w: (w.screen.width || w.innerWidth),
      h: (w.screen.height || w.innerHeigh)
    };
  },
  _prepareUser: function () {
    const userId = this._getUserId();
    return (userId) ? {id: userId} : null;
  },
  _getUserId: function () {
    return utils.getCookie(COOKIE) || null;
  },
};
registerBidder(spec);
