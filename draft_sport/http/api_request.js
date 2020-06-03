/* Draft Sport JS - API request class */

if (!GLOBAL_API_ENDPOINT) { throw Error("API endpoint undefined"); }
if (GLOBAL_DEBUG_FLAG !== true && GLOBAL_DEBUG_FLAG !== false) {
     throw Error("Global debug flag undefined"); 
}

class ApiRequest {

    static get _KEY_HEADER() { return 'x-draft-sport-api-key'; }
    static get _SESSION_ID_HEADER() { return 'x-draft-sport-session-id'; }
    static get _JSON_HEADER() { return 'application/json;charset=UTF-8'; }

    static make(
        path,             // String e.g. '/humans'
        method,           // String e.g. 'GET'
        parameters=null,  // UrlParameters (optional)
        data=null,        // Object e.g. {'hello': 'world' } (optional)
        callback,         // Function(ApiError?, Data?),
        session=null,     // Optional Session (overrides global constants)
        apiEndpoint=null, // Optional String (overrides GLOBAL_API_ENDPOINT)
        withoutAuth=false // Boolean (send request with no authentication)
    ) {

        const Self = ApiRequest;

        if (!path) { throw Error('Cannot make request to falsy path'); }
        if (['GET', 'UPDATE', 'DELETE', 'POST', 'PUT'].indexOf(method) < 0) {
            throw Error('Method appears invalid: ' + method);
        }

        const request = new XMLHttpRequest();
        //if (GLOBAL_DEBUG_FLAG === true) { request.withCredentials = true; }

        request.onreadystatechange = () => {
            Self._parseResponse(request, callback);
            return;
        }

        const endpoint = Self._chooseApiEndpoint(apiEndpoint);
        const url = Self._buildUrl(
            path,
            parameters,
            endpoint
        );

        request.open(method, url, true);

        if (!withoutAuth) {
            const apiKey = Self._chooseApiKey(session);
            const sessionId = Self._chooseSessionId(session);
            request.setRequestHeader(Self._SESSION_ID_HEADER, sessionId);
            request.setRequestHeader(Self._KEY_HEADER, apiKey); 
        }
        
        if (data) {
            console.log('SEND DATA');
            request.setRequestHeader('content-type', Self._JSON_HEADER);
            request.send(JSON.stringify(data));
        } else {
            console.log('DO NOT SEND DATA');
            request.send();
        }

        return;

    }

    static _buildUrl(path, parameters, apiEndpoint) {
        const Self = ApiRequest;
        const base = apiEndpoint + path;
        if (parameters) { return base + parameters.query; }
        return base;

    }

    static _parseResponse(request, callback) {

        const state = request.readyState;
        const status = request.status;

        if (state === 4 && status === 200) {
            let result = null;
            try {
                const rawText = request.responseText;
                /* Convert 64-bit integers to strings because FU JavaScript */
                const quotedBody = rawText.replace(
                    _AR_QUOTE_EXPRESSION,
                    '\"$&\"'
                );
                result = JSON.parse(quotedBody);
            } catch(error) {
                const decodeError = new ApiResponseDecodingError(
                    request.responseText,
                    error
                );
                callback(decodeError, null);
                return;
            }

            callback(null, result);
            return;

        } else if (state === 4 && status === 404) {

            callback(null, null);

        } else if (state === 4 && status !== 200 ) {

            let errorContent = null;

            try {
                console.log(request.responseText);
                errorContent = JSON.parse(request.responseText);
            } catch (error) {
                callback(new ApiError(status), null);
                return
            }

            const error = new ApiError(status, errorContent);
            callback(error, null);
            return;
        }

        return;

    }

    static _chooseApiKey(override) {
        if (override) { return override.apiKey; }
        if (typeof(GLOBAL_API_KEY) !== 'undefined') { return GLOBAL_API_KEY; }
        throw Error('No API Key available. Define `GLOBAL_API_KEY` in global sc\
ope or supply Session instance to ApiRequest.make()');
    }

    static _chooseSessionId(override) {
        if (override) { return override.sessionId; }
        if (typeof(GLOBAL_SESSION_ID) !== 'undefined') { 
            return GLOBAL_SESSION_ID;
        }
        throw Error('No Session ID available. Define `GLOBAL_SESSION_ID` in glo\
bal scope or supply Session instance to ApiRequest.make()');
    }

    static _chooseApiEndpoint(override) {
        if (override) { return override; }
        if (typeof(GLOBAL_API_ENDPOINT) !== 'undefined') {
            return GLOBAL_API_ENDPOINT;
        }
        throw Error('No API endpoint available. Define `GLOBAL_API_ENDPOINT in \
global scope or supply String apiEndpoint parameter to ApiRequest.make()');
    }

    static decodeResponse(
        error,      // Error?
        data,       // Object?
        callback,   // Function(Error?, T?)
        outputType  // T<Having .decode(:Object) method>
    ) {
        let result = null;
        if (error != null) { callback(error, null); return; }
        try { result = outputType.decode(data); }
        catch (error) { callback(error, null); return; }
        callback(null, result);
        return;
    }

    static decodeSingle(
        error,      // Error?
        data,       // Object?
        callback,   // Function(Error?, T?)
        outputType  // T<Having .decode(:Object) method>
    ) {
        let result = null;
        if (error != null) { callback(error, null); return; }
        try { result = outputType.decode(data[0]); }
        catch (error) { callback(error, null); return; }
        callback(null, result);
        return;
    }

    static decodeManyInResponse(
        error,      // Error?
        data,       // Array<Object>?
        callback,   // Function(Error?, T?)
        outputType  // T<Having .decode(:Object) method>
    ) {
        let result = null;
        if (error != null) { callback(error, null); return; }
        try { result = data.map((d) => { return outputType.decode(d); }); }
        catch (error) { callback(error, null); return; }
        callback(null, result);
        return;
    }

}
