type tDataErrorResponse = {
    error: {
        code: string
        message?: string
        fields?: Record<string, {message: string}>
    }
};

export class ApiError extends Error {
    constructor(public status: number, public data: tDataErrorResponse) {
        super(data.error.message);
        this.status = status;
        this.data = data;
    }
}
