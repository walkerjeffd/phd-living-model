define(["jquery","underscore","backbone","app/charts"],function(e,t,n){var r=n.View.extend({template:t.template(e("#template-parameters").html()),initialize:function(){console.log("ParametersView: initialize"),this.render();var e=this;this.$(".slider").change(function(){e.$("#"+this.name).text(this.value),e.model.set(this.name,+this.value),e.model.trigger("changeParam")}),this.listenTo(this.model,"sync",this.updateSliders)},updateSliders:function(){var e=this;this.$(".slider").each(function(t){this.value=+e.model.get(this.name),e.$("#"+this.name).text(this.value)})},render:function(){return console.log("ParametersView: render"),this.$el.html(this.template()),this}});return r});