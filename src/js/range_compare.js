$("#range-target").click(function() {
    // highlight all mons (make sure it works with the colors)
    // both player and AI

    // once another one is clicked, set the range-target to that mon

    // update sprite to display the selected mon
    // update label to specificy if player or AI mon
    // pull current, max HP and current item from the target mon
    
    // save the selected mon in a hidden field or something
    return; // temp
});

$("#range-addMove").click(function() {
    // show and enable buttons on every move to add it to range-moves
        // when those buttons are pressed add to range-moves
    const showRangeAddBtns = $("#range-addMove").is(":checked");

    $(".addRangeBtn").each(function(index, element) {
        $(this).css("display", showRangeAddBtns ? "inline" : "none");
        $(this).prop('disabled', !showRangeAddBtns);
    });
});