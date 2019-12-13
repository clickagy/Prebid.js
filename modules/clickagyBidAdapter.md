# Overview

```
Module Name: Clickagy Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@clickagy.com
```

# Description

You can use this adapter to get a bid from Clickagy.

About us : https://www.clickagy.com/

# Test Parameters

```
var adUnits = [
  {
    code: "test-leaderboard",
    sizes: [[728, 90]],
    bids: [{
      bidder: "clickagy",
      params: {
        publisherId: "abc123",
        tagid: "123"
      }
    }]
  }, {
    code: "test-banner",
    sizes: [[300, 250]],
    bids: [{
      bidder: "clickagy",
      params: {
        publisherId: "abc123",
        bidfloor: 0.01,
        tagid: "124"
      }
    }]
  }, {
    code: "test-sidebar",
    size: [[160, 600]],
    bids: [{
      bidder: "clickagy",
      params: {
        publisherId: "abc123"
      }
    }]
  }
];

pbjs.que.push(() => {
  pbjs.setConfig({
    userSync: {
      userIds: [{
        name: "pubCommonId",
        storage: {
          type: "cookie",
          name: "cb",
          expires: 364,
        }
      }]
    }
  });
});
```
