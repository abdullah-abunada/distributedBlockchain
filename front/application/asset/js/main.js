(function($) {
    'use strict';

    //MOBILE MENU

    $('#mainmenu').slicknav({
        prependTo: '.navigation'
    });

    //EMBED RESPONSIVE

    $(".embed-responsive iframe").addClass("embed-responsive-item");

    //TOOL TIP

    $('[data-toggle="tooltip"]').tooltip();

    // COUNTER UP

    //TAB ANIMATAION SLIDE

    jQuery('.tabs.animated-slide-2 .tab-links a').on('click', function(e) {
        var currentAttrValue = jQuery(this).attr('href');

        // Show/Hide Tabs
        jQuery('.tabs ' + currentAttrValue).slideDown(400).siblings().slideUp(400);

        // Change/remove current tab to active
        jQuery(this).parent('li').addClass('active').siblings().removeClass('active');

        e.preventDefault();
    });

     //WOW ANIMATION
        
    new WOW().init();

    jQuery(window).load(function() {

        $(".stick").sticky({ topSpacing: 0 });


    });




})(jQuery);