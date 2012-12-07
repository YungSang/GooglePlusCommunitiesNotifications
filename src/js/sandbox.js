window.addEventListener('message', function(event) {
  switch (event.data.action) {
  case 'evalJSON':
    var res = {
      seq : event.data.seq
    };
    res.json = eval('(' + event.data.value + ')');
    top.postMessage(res, '*');
    break;
  default:
  }
});