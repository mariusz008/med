$(document).ready(function(){
  $('.hour').on('click', function(){
    var hour = $('#piec').val($(this));
    console.log(hour);

    //
    // //$('#piec').val($(this)).data('xd');
    //
    // var url = '/selectedHour/' + hour;
    // if (confirm('Chcesz wybrać tą godzinę?')) {
    //   $.ajax({
    //     url:url,
    //     type:'POST',
    //     data: {
    //       yourScore: $('input[name="xd"]').val(),
    //       ys: $('input[name="piec1"]').val()
    //     },
    //
    //     success: function(result){
    //       console.log('potwierdziles');
    //
    //     },
    //     error: function(err) {
    //       console.log(err);
    //     }
    //   });
    // }

  });

});



