(function(window){
  var $;
  var jQuery_page
  var jQuery_trello_bookmarklet;

  // Keep track of the jQuery included in the page
  $ = window.$ = jQuery_page = window.jQuery;

  var get_est_jira_time = function() {
      var jira_time = $('#tt_single_values_orig').text().trim();
      var hours = jira_time.match(/[+-]?\d+\.\d+/g);

      if (hours != null && hours.length > 0) {
          return " (" + hours[0] + ")";
      } else {
          return "";
      }
  }

  /* This is run after we've connected to Trello and selected a list */
  var run = function(Trello, idList) {
    var name;
    // Default description is the URL of the page we're looking at
    var desc = location.href;

    var bugsnag_error = $('meta[content="Bugsnag"').length,
        fogbugz_case = window.goBug,
        github_commit = $("#all_commit_comments").length,
        github_issue = $("#show_issue").length,
        gmail_email = $('h1 .hP').length,
        jira_5_1_or_newer = $("#jira").length,
        jira_older_installation = $("#issue_header_summary").length,
        redmine_issue = jQuery('head meta[content=Redmine]').length,
        requesttracker_ticket = $('#header h1').length,
        uservoice_ticket = $('body[uv-sheet-container]').length;

    if (bugsnag_error) {

      name = "[BUGSNAG] " + $('#main-content > header > h4').text();
      desc = "Link to exception: " + location.href;
      desc += "\n" + $('.Stacktrace-raw').text();

    } else if (fogbugz_case) {

      // We're looking at a FogBugz case
      name = goBug.ixBug + ": " + goBug.sTitle

    } else if (jira_older_installation){

      // We're looking at a JIRA case in an older JIRA installation
      name = $("#key-val").text() + ": " + $("#issue_header_summary").text();

    } else if (jira_5_1_or_newer){

      // We're looking at a 5.1+ JIRA case
      name = $("#key-val").text() + ": " + $("#summary-val").text() +  get_est_jira_time();

    } else if (github_issue) {

      // We're looking at a GitHub issue
      name = $("#show_issue .number strong").text() + " " + $("#show_issue .discussion-topic-title").text();

    } else if (github_commit) {

      // We're looking at a GitHub commit
      name = $(".js-current-repository").text().trim() + ": " + $(".commit .commit-title").text().trim();
      
    } else if (redmine_issue) {
      
      // We're looking at a redmine issue
      name = $("#content h2:first").text().trim() + ": " + $("#content h3:first").text().trim();

    } else if (requesttracker_ticket) {

        // We're looking at a RequestTracker (RT) ticket
        name = $('#header h1').text().trim();

    } else if (gmail_email){
        
        // we're looking at an email in Gmail
        name = $('h1 .hP').text().trim();
    
    } else if (uservoice_ticket) {

        // We're looking at UserVoice tickets
        var ticket_number_regex = /.*\/admin\/tickets\/(\d+).*/;
        var ticket_number = ticket_number_regex.exec(location.href);
        name = "[DoC #" + ticket_number[1] + "] " + $('h1.ticket-subject-header').text().trim();
        desc = "Link to Ticket: " + location.href;
        desc += "\nReported by: " +  window.currentSupportAgent.displayName;

    }
    
    else {
        // use page title as card title, taking trello as a "read-later" tool
        name = $.trim(document.title);
        
    }

    // Get any selected text
    var selection;

    if(window.getSelection) {
      selection = ""+window.getSelection();
    } else if(document.selection && document.selection.createRange) {
      selection = document.selection.createRange().text;
    } 
    
    if (!selection && $('.gs .adP').length){
        
        // we're looking at an email in Gmail
        selection = $('.gs .adP').eq(0).html();
        selection = selection.replace(/(<br\s*[/]?>|<\/p>|<\/div>|<\/blockquote>)/gi,'\n$1');
        selection = $(selection).text();
        if(selection){
            selection = '------ original content ------\n\n'+selection;
        }
    
    }


    // If they've selected text, add it to the name/desc of the card
    if(selection) {
      if(!name) {
        name = selection;
      } else {
        desc += "\n\n" + selection;
      }
    }
    
    name = name || 'Unknown page';

    // Create the card
    if(name) {
      // Use newer (2.x) jQuery version to avoid CORS errors
      (function(jQuery) {
        Trello.post("lists/" + idList + "/cards", {
          name: name,
          desc: desc
        }, function(card){
          // Perform a really swell extra step if we're on a UserVoice ticket
          if (uservoice_ticket) {
            Trello.post("cards/" + card.id + "/stickers", {
              image: "55f31772076c0979149588f2",
              top: 0,
              left: 0,
              zIndex: 0
            });
          }

          // Display a little notification in the upper-left corner with a link to the card
          // that was just created
          var $cardLink = $("<a>")
          .attr({
            href: card.url,
            target: "card"
          })
          .text("Created a Trello Card")
          .css({
            position: "absolute",
            left: 0,
            top: 0,
            padding: "4px",
            border: "1px solid #000",
            background: "#fff",
            "z-index": 1e3
          })
          .appendTo("body")

          setTimeout(function(){
            $cardLink.fadeOut(3000);
          }, 5000)
        })

        $ = window.$ = window.jQuery = jQuery_page;
      }(jQuery_trello_bookmarklet))
    }
  }

  var storage = window.localStorage;
  if(!storage) {
    return;
  }

  // Store/retrieve a value from local storage
  var store = function(key, value){
    if(arguments.length == 2){
      return (storage[key] = value);
    } else {
      return storage[key];
    }
  };

  // A fake "prompt" to get info from the user
  var overlayPrompt = function(html, hasInput, callback){
    var done = function(value){
      $div.remove();
      $overlay.remove();
      callback(value);
    };

    // Cover the existing webpage with an overlay
    var $overlay = $("<div>")
    .css({
      background: "#000",
      opacity: .75,
      "z-index": 1e4,
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    })
    .appendTo("body")
    .click(function(){
      done(null);
    })

    // Show a "popup"
    var $div = $("<div>")
    .css({
      position: "absolute",
      border: "1px solid #000",
      padding: "16px",
      width: 300,
      top: 64,
      left: ($(window).width() - 200) / 2,
      background: "#fff",
      "z-index": 1e5
    })
    .appendTo("body");

    // Show the prompt
    $("<div>").html(html).appendTo($div);

    // Optionally show an input
    var $input = $("<input>")
    .css({ 
      width: "100%",
      "margin-top": "8px"
    })
    .appendTo($div)
    .toggle(hasInput);

    // Add an "OK" button
    $("<div>")
    .text("OK")
    .css({ 
      width: "100%", 
      "text-align": "center",
      border: "1px solid #000",
      background: "#eee",
      "margin-top": "8px",
      cursor: "pointer"
    })
    .appendTo($div)
    .click(function(){
      done($input.val());      
    });

    return $div;
  };

  // Run several asyncronous functions in order
  var waterfall = function(fxs){
    var runNext = function(){
      if(fxs.length){
        fxs.shift().apply(null, Array.prototype.slice.call(arguments).concat([runNext]))
      }
    }
    runNext();
  }

  // The ids of values we keep in localStorage
  var appKeyName = "trelloAppKey";
  var idListName = "trelloIdList";

  waterfall([
    // Load jQuery
    function(next) {
      if (parseInt(window.jQuery.fn.jquery.split(".")[0]) >= 2) {
        jQuery_trello_bookmarklet = $;
        next(null);
      } else {
        var script = document.createElement("script");
        script.onload = next;
        script.onreadystatechange = next;
        script.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js";
        document.getElementsByTagName("head")[0].appendChild(script);

        jQuery_trello_bookmarklet = jQuery.noConflict(true);
      }
    },
    // Get the user's App Key, either from local storage, or by prompting them to retrieve it
    function(ev, next) {
      var appKey = store(appKeyName) || window[appKeyName];
      if(appKey && appKey.length == 32) {
        next(appKey);
      }
      else {
        overlayPrompt("Please specify your Trello API Key (you'll only need to do this once per site)<br><br>You can get your API Key <a href='https://trello.com/1/appKey/generate' target='apikey'>here</a><br><br>", true, function(newAppKey){
          if(newAppKey) {
            next(newAppKey);
          }
        })
      }
    },
    // Load the Trello script
    function(appKey, next) { $.getScript("https://trello.com/1/client.js?key=" + appKey, next); },
    // Authorize our application
    function(a, b, c, next) {
      store(appKeyName, Trello.key())
      Trello.authorize({
        interactive: false,
        success: next,
        error: function(){
          overlayPrompt("You need to authorize Trello", false, function(){
            Trello.authorize({
              type: "popup",
              expiration: "never",
              scope: { read: true, write: true },
              success: next
            });
          });
        }
      });
    },
    // Get the list to add cards to, either from local storage or by prompting the user
    function(next) {
      var idList = store(idListName) || window[idListName];
      if(idList && idList.length == 24) {
        next(idList);
      } else {
        Trello.get("members/me/boards", { fields: "name" }, function(boards){
          $prompt = overlayPrompt('Which list should cards be sent to?<hr><div class="boards" style="height:500px;overflow-y:scroll"></div>', false, function(){
            idList = $prompt.find("input:checked").attr("id");
            next(idList);
          })

          $.each(boards, function(ix, board){
            $board = $("<div>").appendTo($prompt.find(".boards"))

            Trello.get("boards/" + board.id + "/lists", function(lists){
              $.each(lists, function(ix, list) {
                var $div = $("<div>").appendTo($board);
                idList = list.id;
                $("<input type='radio'>").attr("id", idList).attr("name", "idList").appendTo($div);
                $("<label>").text(board.name + " : " + list.name).attr("for", idList).appendTo($div);
              });
            })
          });
        });
      }      
    },
    // Store the idList for later
    function(idList, next) {
      if(idList) {
        store(idListName, idList);
        next(Trello, idList);
      }      
    },
    // Run the user portion
    run
  ]);
  // Reset jQuery to the version included in the page
  $ = window.$ = window.jQuery = jQuery_page;
})(window);
