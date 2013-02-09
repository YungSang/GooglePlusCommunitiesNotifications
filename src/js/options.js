$('a').live('click' ,function(event) {
  event.preventDefault();
  event.stopPropagation();
  window.open($(this).attr('href'), '');
  return false;
});

function loadCommunities() {
console.log('loadCommunities');
  var $tbody = $('#community_list tbody');
  var communities = bg.GPCN.communities.concat();
/*
  communities.sort(function(a, b) {
    if (b.unread == a.unread) {
      return (b.name - a.name);
    }
    return (b.name - a.name);
  });
*/
  var hidden_communities = bg.GPCN.getHiddenCommunities();

  communities.forEach(function(community) {
    var $tr = $('<tr/>', {
      'data-id' : community.id
    }).appendTo($tbody);

    var $a1 = $('<a/>', {
      href  : bg.GPCN.BASE_URL + 'communities/' + community.id,
      title : community.name
    });
    var $a2 = $a1.clone();

    var $td = $('<td/>', {
      class : 'community_image'
    }).appendTo($tr);
    $a1.appendTo($td);
    $('<img/>', {
      src : community.icon,
      alt : community.name
    }).appendTo($a1);

    $td.badger(community.unread || '');

    $td = $('<td/>', {
      class : 'community_name'
    }).appendTo($tr);
    $a2.append(community.name);
    $('<h3/>').append($a2).appendTo($td);

    var desc = '';
    if (community.line) {
      desc += '<b>' + community.line + '</b><br/>';
    }
    desc += truncateText(community.desc, 140);
    $('<div/>').append(desc).appendTo($td);

    $td = $('<td/>', {
      class : 'community_hide'
    }).appendTo($tr);
    var $checkbox = $('<input/>', {
        type  : 'checkbox',
        name  : 'hidden_community',
        value : community.id
    }).appendTo($td).click(function() {
      hidden_communities = [];
      $('input:checked').each(function() {
        hidden_communities.push($(this).val());
      });
      bg.GPCN.setHiddenCommunities(hidden_communities);
    });
    if ($.inArray(community.id, hidden_communities) != -1) {
      $checkbox.attr('checked', 'checked');
    }
  });
}

function truncateText(text, length) {
  text = text.replace(/(<br\s*\/?>)+/g, ' ');
  text = text.replace(/<a[^>]*>/g, ' ');
  text = text.replace(/<\/a>/g, ' ');
  return (text.length > length) ? text.substr(0, length - 3) + '...' : text;
}

var bg = chrome.extension.getBackgroundPage();
var manifest = chrome.runtime.getManifest();

$(function() {
  $('.need2translate').each(function() {
    $this = $(this);
    var translated = $this.html().replace(/__MSG_(.+)__/g, function (m, key) {
      return chrome.i18n.getMessage(key);
    });
    $this.html(translated);
  });

  loadCommunities();

  $('#version').html(manifest.version);
});