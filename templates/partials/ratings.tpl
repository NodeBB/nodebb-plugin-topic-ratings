
<span class="topic-ratings-stars text-warning" component="topic/ratings" data-topic-rating="{./rating}" data-user-rating="{./userRating}" data-tid="{./tid}" data-num-ratings="{./numRatings}">
{{{ each ./ratings}}}
<a href="#" class="text-reset"><i class="fa {./icon}" data-rating="{./value}"></i></a>
{{{ end }}}
</span>
