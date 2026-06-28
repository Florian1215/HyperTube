import {iMovie} from "@/types/movie";
import {iCommentDetails} from "@/types/comment";

    export default function addProgressToMovie(history?: iMovie[], movies?: iMovie[], comments?: iCommentDetails[]) {
    if (!history)
        return movies;
    else if (comments) {
        return comments.map((comment) => {
            const historyMovie = history.find(m => m.imdb_id === comment.movie.imdb_id);
            if (historyMovie) {
                comment.movie.progress = historyMovie.progress;
                comment.movie.complete = historyMovie.complete;
            }
            return comment;
        })
    } else if (movies) {
        return movies.map((movie) => {
            const historyMovie = history.find(m => m.imdb_id === movie.imdb_id);
            if (historyMovie) {
                movie.progress = historyMovie.progress;
                movie.complete = historyMovie.complete;
            }
            return movie;
        })
    }
}
