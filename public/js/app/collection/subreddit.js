define(['App', 'backbone', 'model/single', "moment"], function(App, Backbone, SingleModel) {
  return Backbone.Collection.extend({

    initialize: function(models, data) {
      _.bindAll(this);

      this.countNonImg = 0 //keeps track of how many non image based posts are in the subreddit

      this.after = ""
      this.subName = data.subName

      this.sortOrder = data.sortOrder
      this.domain = data.domain
      this.forceJSONP = data.forceJSONP || false //so we force the user to download the subreddit with jsonp
        //this.count = 1
      if (typeof this.sortOrder === 'undefined' || this.sortOrder === 'reqAsBot=1') {
        this.sortOrder = 'hot' //the default sort order is hot
      }

      this.subID = this.subName + this.sortOrder

      this.type = data.type || 'subreddit'

      //build the URL string before fetch
      if (this.type == 'subreddit') {
        if (this.subName == "front" || this.domain !== null) {
          this.subnameWithrR = ''
        } else {
          this.subnameWithrR = 'r/' + this.subName + '/'
        }
      } else { // multihub
        this.subnameWithrR = 'u/' + data.userName + '/m/' + this.subName + '/'
      }

      if (this.domain !== null) {
        this.domainStr = 'domain/' + this.domain + '/'
      } else {
        this.domainStr = ''
      }

      if (typeof data.timeFrame !== "undefined" && (this.sortOrder == 'controversial' || this.sortOrder == 'top')) { //known as "t" in the reddit API
        this.timeFrame = "&t=" + data.timeFrame
      } else {
        this.timeFrame = '' //blank if not in top/contrive
      }

      if (typeof data.instanceUrl !== 'undefined') {
        //so we can override the URL to pull in 1000 posts test data
        this.instanceUrl = data.instanceUrl
      } else {
        this.instanceUrl = this.getUrl()
      }

    },
    model: SingleModel,
    url: function() {
      return this.instanceUrl //keeps a dynamic URL so we can give it a new "after"
    },
    getUrl: function() {
      var username = App.user.name || false
      var linkCount = App.settings.get('linkCount')

      if (username !== false && this.forceJSONP === false) {
        console.log('getting subreddit via redditjs server.....')
        return '/api/?url=' + this.domainStr + this.subnameWithrR + this.sortOrder + ".json&limit=" + linkCount + "&after=" + this.after + this.timeFrame
      } else {
        console.log('getting subreddit via JSONP')

        return 'https://reddit.com/' + this.domainStr + this.subnameWithrR + this.sortOrder + ".json?after=" + this.after + this.timeFrame + "&limit=" + linkCount + "&jsonp=?"
      }
    },
    parse: function(response) {
      if (typeof response === 'undefined' || response.length === 0) {
        return
      }

      var self = this
      var models = []

      this.after = response.data.after;

      if (typeof this.after === 'undefined' || this.after === "" || this.after === null) {
        this.after = "stop" //tells us we have finished downloading all of the possible posts in this subreddit
      }

      var modhash = response.data.modhash;
      if (typeof modhash == "string" && modhash.length > 5) {
        $.cookie('modhash', modhash, {
          path: '/'
        });
      }

      //build the children array of the reddit posts into the main collection
      _.each(response.data.children, function(item, count) {
        if (item.data.hidden === false) {

          // item.data.count = count

          if ((count % 2) === 0) {
            item.data.evenOrOdd = "even"
          } else {
            item.data.evenOrOdd = "odd"
          }

          if (item.data.imgUrl === false) {
            self.countNonImg++;
          }

          models.push(item.data)

        }
      });

      return models;
    },
    removeNonImgs: function() {
      //the slideshow needs to only have images in it
      this.remove(this.where({
        imgUrl: false
      }));
    },
    //checks the subreddit to make sure it has no image posts.
    //returns true if it contains at least one image
    hasNoImages: function() {
      var nonImgs = this.where({
        imgUrl: false
      })
    }
  });
});
