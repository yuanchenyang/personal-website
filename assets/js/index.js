document.addEventListener('DOMContentLoaded', function () {
    // Make iframes in post content responsive (replaces fitVids)
    document.querySelectorAll('.post-content iframe').forEach(function (iframe) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;';
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        iframe.parentNode.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
    });
});
