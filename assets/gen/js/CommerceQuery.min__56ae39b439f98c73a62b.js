webpackJsonpCoveo__temporary([85],{293:function(t,n,o){"use strict";var e=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,n){t.__proto__=n}||function(t,n){for(var o in n)n.hasOwnProperty(o)&&(t[o]=n[o])};return function(n,o){function e(){this.constructor=n}t(n,o),n.prototype=null===o?Object.create(o):(e.prototype=o.prototype,new e)}}();Object.defineProperty(n,"__esModule",{value:!0});var i=o(7),r=o(8),s=o(11),p=o(56),u=o(2),l=o(3),a=function(t){function n(o,e,i){var u=t.call(this,o,n.ID,i)||this;return u.element=o,u.options=e,u.bindings=i,u.options=r.ComponentOptions.initComponentOptions(o,n,e),u.bind.onRootElement(s.QueryEvents.doneBuildingQuery,u.handleDoneBuildingQuery),u.bind.onRootElement(p.AnalyticsEvents.changeAnalyticsCustomData,u.handleChangeAnalytics),u}return e(n,t),n.prototype.handleDoneBuildingQuery=function(t){this.options.listing&&(t.queryBuilder.tab=this.options.listing,t.queryBuilder.addContextValue("listing",this.options.listing))},n.prototype.handleChangeAnalytics=function(t){this.options.listing&&(t.originLevel2=this.options.listing)},n.ID="CommerceQuery",n.doExport=function(){l.exportGlobally({CommerceQuery:n})},n.options={listing:r.ComponentOptions.buildStringOption()},n}(i.Component);n.CommerceQuery=a,u.Initialization.registerAutoCreateComponent(a)}});
//# sourceMappingURL=CommerceQuery.min__56ae39b439f98c73a62b.js.map