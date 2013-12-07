define(['App', 'underscore', 'backbone', 'hbs!template/single', 'hbs!template/loading', 'view/post-row-view', 'view/sidebar-view', 'view/basem-view', 'model/single', 'view/comment-view', 'cookie'],
	function(App, _, Backbone, singleTmpl, loadingTmpl, PostRowView, SidebarView, BaseView, SingleModel, CommentView, Cookie) {
		return BaseView.extend({
			template: singleTmpl,
			events: {

				'click #retry': 'tryAgain',
				//'click .expando-button': 'toggleExpando',
				'click .leftArrow': 'gotoPrev',
				'click .rightArrow': 'gotoNext',
				'click .toggleDropdownCmntSort': 'toggleDropDownCmtSort',
				'click .drop-choices-single a': 'changeCmntSort',
				'click .mdHelpShow': 'showMdHelp',
				'click .mdHelpHide': 'hideMdHelp',
				'submit #mainComment': 'comment'

			},

			regions: {
				'thepost': '#thepost',
				'siteTableComments': '#siteTableComments'

			},
			ui: {
				loadingC: '#loadingC',
				text: '.text',
				commentreply: '.commentreply',
				'mdHelp': '.mdHelp',
				'mdHelpShow': '.mdHelpShow',
				'mdHelpHide': '.mdHelpHide',
				'status': '.status'
			},

			initialize: function(options) {
				_.bindAll(this);

				var self = this;
				this.subName = options.subName
				this.id = options.id
				this.commentLink = options.commentLink
				this.hasRendered = false

				if (typeof window.curModel === 'undefined') {

					this.fetchComments(this.loaded)
					this.template = loadingTmpl

				} else {
					console.log('loading a model from memory')
					//this is what we do when we pass in a model with out the comments
					this.model = window.curModel;
					this.updatePageTitle(this.model.get('title'));
					delete window.curModel; //memory management
					this.renderStuff(this.model);
					//well now we need to get the comments for this post!
					this.fetchComments(this.loadComments)

				}

				App.on("single:remove", this.remove, this);
				App.on("single:giveBtnBarID", this.triggerID, this);

			},
			onRender: function() {
				var self = this
				if (typeof this.model !== 'undefined') {

					self.thepost.show(new PostRowView({
						model: self.model,
						gridOption: 'normal',
						expand: true,
						isSingle: true
					}));

				}
				this.triggerID()
				this.scrollTop()
				$(window).resize(this.debouncer(function(e) {
					self.resize()
				}));
			},
			onBeforeClose: function() {

				$(window).off('resize', this.debouncer);
				App.off("single:remove", this.remove, this);
				App.off("single:giveBtnBarID", this.triggerID, this);

				//removes the ajax call if the user decided to leave the page while still waiting on reddit api
				if (typeof this.fetchXhr !== 'undefined' && this.fetchXhr.readyState > 0 && this.fetchXhr.readyState < 4) {
					this.fetchXhr.abort();
				}
				this.fetchXhr.abort()

			},
			toggleDropDownCmtSort: function() {
				this.$('.drop-choices-single').toggle()
			},
			changeCmntSort: function(e) {
				e.preventDefault()
				e.stopPropagation()
				this.$('.drop-choices-single').hide()
				var target = this.$(e.currentTarget)
				var sortOrder = target.text()
				this.$('.selectedCmntSort').html(sortOrder)
				this.$('#siteTableComments').empty()
				//this.comments.reset()
				this.fetchComments(this.loadComments, sortOrder)
			},
			addOutboundLink: function() {
				this.$('.usertext-body a').addClass('outBoundLink').attr("data-bypass", "true"); //makes the link external to be clickable
				this.$('.usertext-body a').attr('target', '_blank');
			},
			updatePageTitle: function(title) {
				document.title = title + "- RedditJS Beta"
			},

			fetchComments: function(callback, sortOrder) {

				this.comments = new SingleModel({
					subName: this.subName,
					id: this.id,
					parseNow: true,
					sortOrder: sortOrder
				});

				//this.render();
				this.fetchXhr = this.comments.fetch({
					success: callback,
					error: this.fetchError
				});

				if (this.commentLink !== null) {
					this.loadLinkedComment()
				}

			},
			//this function displays a single comment if the user is viewing a linked comment via the permalink feature
			loadLinkedComment: function() {

				//$(this.el).html("<div class='loadingS'></div>")
				var self = this
				var link_id = 't3_' + this.id
				var params = {
					link_id: link_id,
					id: this.commentLink,
					api_type: 'json',

					//children: this.model.get('children').join(","),
					children: this.commentLink,
					byPassAuth: true
				}

				this.api("api/morechildren.json", 'POST', params, function(data) {
					if (typeof data !== 'undefined' && typeof data.json !== 'undefined' && typeof data.json.data !== 'undefined' && typeof data.json.data.things !== 'undefined') {

						require(['model/comment'], function(CommentModel) {
							data.children = data.json.data.things
							var tmpModel = new CommentModel({
								skipParse: true
							})
							self.linkedCommentModel = tmpModel.parseComments(data, link_id)
							self.linkedCommentModel = self.linkedCommentModel.models[0]

							self.linkedCommentModel.set('permalink', document.URL)

							if (self.hasRendered === true) {
								self.loadLinkedCommentView()
							}

						})

					}
				});

			},

			/**************UI functions ****************/
			resize: function() {
				var mobileWidth = 1000; //when to change to mobile CSS
				//change css of 

				var docWidth = $(document).width()
				var newWidth = 0;
				if (docWidth > mobileWidth) {
					//if the website is in responsive mode
					newWidth = docWidth - 522;
				} else {
					newWidth = docWidth - 222;
				}
				$('#dynamicWidth').html('<style> .embed img { max-width: ' + newWidth + 'px };   </style>');

			},

			triggerID: function() {
				App.trigger("bottombar:selected", "t3_" + this.id);
				//App.trigger("bottombar:selected", this.model);
			},

			/**************Fetching functions ****************/
			fetchError: function(response, error) {
				console.log("fetch error, this probly happened because you navigated away")

				$(this.el).html("<div id='retry' >  <div class='loading'></div> </div> ")

			},
			tryAgain: function() {
				$(this.el).append("<style id='dynamicWidth'> </style>")
				$(this.el).html("<div id='retry' >  <img src='img/sad-icon.png' /><br /> click here to try again </div> ")
				this.model.fetch({
					success: this.loaded,
					error: this.fetchError
				});
			},
			gotoPrev: function() {
				App.trigger('btmbar:gotoPrev')
			},
			gotoNext: function() {
				App.trigger('btmbar:gotoNext')
			},

			renderStuff: function(model) {
				//console.log('rendering single=', this.model)
				this.template = singleTmpl
				this.render()

				this.hasRendered = true
				this.addOutboundLink()
				this.loadLinkedCommentView()
				$(this.el).append("<style id='dynamicWidth'> </style>")
				this.resize()

				//shows the key navigation help on hover
				this.$('.arrowNav').hover(
					function(e) {

						self.$('#arrowNavHelp').show()

					},
					function(e) {
						self.$('#arrowNavHelp').hide()
					}
				)

			},
			loadLinkedCommentView: function() {
				if (typeof this.linkedCommentModel !== 'undefined') {
					console.log('loading linked comment view')
					//this.linkedCommentView.render()
					var comment = new CommentView({
						model: this.linkedCommentModel,
						id: this.linkedCommentModel.get('id'),
						root: "#linkedComment"
						//root: "#commentarea"
					})
					this.$('#linkedComment .usertext-body').first().css('background-color', '#F5F5A7')

				}
			},
			//if we dont pass in a model we need to render the comments here
			loadComments: function(model, res) {
				//this.$('.loadingS').remove()
				this.ui.loadingC.remove()
				this.permalinkParent = this.model.get('permalink') //this is for the comment callback so we can set the permalink after someone comments on a main post
				this.renderComments(model.get('replies'))

			},
			loaded: function(model, res) {
				//this.$('.loading').hide()
				this.model = model

				//this.model = model.parseOnce(model.attributes)
				this.renderStuff(model);
				this.loadComments(model);
				//console.log('before activiating btm bar=', model)

			},

			addOneChild: function(model) {
				this.collection.add(model)
			},

			renderComments: function(collection) {
				//console.log('collection in renderComments', collection)
				var self = this
				this.updatePageTitle(this.model.get('title'))
				this.collection = collection

				App.on("comment:addOneChild" + this.model.get('name'), this.addOneChild);

				require(['cView/comments', 'view/comment-view'], function(CViewComments, CommentView) {
					self.commentCollectionView = new CViewComments({
						collection: collection,
						itemView: CommentView
					})
					self.siteTableComments.show(self.commentCollectionView)

				})

			}

		});

	});