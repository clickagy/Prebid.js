import { expect } from 'chai';
import { spec } from 'modules/clickagyBidAdapter';
import { parse as parseUrl } from 'src/url';

describe('Clickagy Bid Adapter', function () {
  let REQUEST, RESPONSE;

  beforeEach(function () {
    REQUEST = [{
      bidder: 'clickagy',
      params: {
        publisherId: '100',
        bidfloor: 0.04,
        tagid: '123',
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bidderRequestId: 'bid-request-123',
      auctionId: 'auction-123',
      adUnitCode: 'adunit-div-code',
      bidId: 'bid-123',
      sizes: [300, 250]
    }];
    RESPONSE = {
      seatbid: [{
        bid: [{
          id: 'bid-123',
          impid: 'bid-123',
          adm: '<!-- Ad creative markup -->',
          requestId: 'auction-123',
          crid: 'creative-123',
          w: 300,
          h: 250,
          price: 0.5
        }]
      }]
    };
  });
  const ENDPOINT = 'https://aorta.clickagy.com/rtb/openrtb/bid?ch=183';
  const USER_SYNC = 'https://aorta.clickagy.com/pixel.gif?ch=183';

  describe('spec.isBidRequestValid', function () {
    it('should return true when the required params are passed', function () {
      const bidRequest = REQUEST[0];
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when params are missing', function () {
      const bidRequest = REQUEST[0];
      delete bidRequest.params;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when the "publisherId" param is missing', function () {
      const bidRequest = REQUEST[0];
      delete bidRequest.params.publisherId;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when no bid params are passed', function () {
      const bidRequest = REQUEST[0];
      bidRequest.params = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when a bid request is not passed', function () {
      expect(spec.isBidRequestValid()).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  it('Verifies valid bid request', function () {
    const topLocation = parseUrl('https://www.example.com?foo=bar', { decodeSearchAsString: true });
    const bidderRequest = {
      refererInfo: {
        referer: topLocation.href
      }
    };
    const request = spec.buildRequests(REQUEST, bidderRequest);
    const rtbRequest = JSON.parse(request.data);

    expect(request.url).to.equal(ENDPOINT);
    expect(request.method).to.equal('POST');

    expect(rtbRequest.imp).to.have.lengthOf(1);
    expect(rtbRequest.imp[0].tagid).to.equal('123');
    expect(rtbRequest.imp[0].bidfloor).to.equal(0.04);
    expect(rtbRequest.imp[0].banner).to.not.equal(null);
    expect(rtbRequest.imp[0].banner.w).to.equal(300);
    expect(rtbRequest.imp[0].banner.h).to.equal(250);

    expect(rtbRequest.site).to.not.equal(null);
    expect(rtbRequest.site.publisher).to.not.equal(null);
    expect(rtbRequest.site.publisher.id).to.equal('100');
    expect(rtbRequest.site.publisher.domain).to.equal(topLocation.hostname);
    expect(rtbRequest.site.domain).to.equal(topLocation.hostname);
    expect(rtbRequest.site.page).to.equal(topLocation.href);

    expect(rtbRequest.device).to.not.equal(null);
    expect(rtbRequest.device.ua).to.equal(navigator.userAgent);
  });

  it('Verify parse response', function () {
    const bids = spec.interpretResponse({ body: RESPONSE });
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(0.5);
    expect(bid.ad).to.equal('<!-- Ad creative markup -->');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('creative-123');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.currency).to.equal('USD');
    expect(bid.ttl).to.equal(360);
  });

  it('Verify empty response', function () {
    const response = { body: null };
    const bids = spec.interpretResponse(response)
    expect(bids).to.have.lengthOf(0);
  });

  it('Verify user syncs', function () {
    const syncs = spec.getUserSyncs({ pixelEnabled: true }, [{ body: RESPONSE }]);
    expect(syncs.map(s => s.url)).to.deep.equal([USER_SYNC]);
    expect(syncs.map(s => s.type)).to.deep.equal(['image']);
  });

  it('Verify user syncs if empty pixel', function () {
    const syncs = spec.getUserSyncs({}, [{ body: RESPONSE }]);
    expect(syncs).to.be.empty;
  });
});
