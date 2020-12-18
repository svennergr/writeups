# People Rater Sourcecode

```html {45}
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Grinch People Rater</title>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
</head>
<body>
<div class="container" style="margin-top:20px">
    <div class="text-center"><img src="/assets/images/grinch-networks.png" alt="Grinch Networks"></div>
    <h1 class="text-center">Grinch People Rater</h1>
    <div class="row">
        <div class="col-md-6 col-md-offset-3 text-center thelist"></div>
        <div class="col-md-6 col-md-offset-3 text-center">
            <input type="button" class="btn btn-default loadmore" value="Load More">
        </div>
    </div>
</div>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>
<script>
    $('.thelist').on("click", "a", function(){
        $.getJSON('/people-rater/entry?id=' + $(this).attr('data-id'), function(resp){
            alert( resp.rating );
        }).fail(function(){
            alert('Request failed');
        });
    });
    var page = 0;
    $('.loadmore').click( function(){
        page++;
        $.getJSON('/people-rater/page/' + page, function(resp){
            if( resp.results.length < 5 ){
                $('.loadmore').hide();
            }
            $.each( resp.results, function(k,v){
                $('.thelist').append('<div style="margin-bottom:15px"><a class="btn btn-info" data-id="' + v.id + '">' + v.name + '</a></div>')
            });
        });
    });
    $('.loadmore').trigger('click');
</script>
</body>
</html>
```