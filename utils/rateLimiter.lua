local redisKey=KEYS[1]
local clientKey=KEYS[2]
local violationKey=KEYS[3]
local abuseKey=KEYS[4]
local blockKey=KEYS[5]

local WINDOW_SIZE = tonumber(ARGV[1])
local MAX_REQ = tonumber(ARGV[2])
local MAX_CLIENT_REQ = tonumber(ARGV[3])

local CLIENT_LIMIT_WINDOW = WINDOW_SIZE * 6
local BLOCK_WINDOW = 60 * 60

--------------------------------------------------
-- 1. Check if IP is already blocked
--------------------------------------------------

local blocked=redis.call("EXISTS",blockKey)

if blocked==1 then
    local blockedTTL=redis.call("TTL",blockKey)
    return {
        "BLOCKED",
        blockedTTL
    }
end

--------------------------------------------------
-- 2. Increment counters
--------------------------------------------------

local clientReq=redis.call("INCR",clientKey)
local currentReq=redis.call("INCR",redisKey)

--------------------------------------------------
-- 3. Set expiration on first request
--------------------------------------------------

if clientReq==1 then
    redis.call("EXPIRE",clientKey,CLIENT_LIMIT_WINDOW)
end

if currentReq==1 then
    redis.call("EXPIRE",redisKey,WINDOW_SIZE)
end

--------------------------------------------------
-- 4. Check IP rate limit
--------------------------------------------------

if currentReq > MAX_REQ then
    --------------------------------------------------
    -- Check if this window has already been registered
    -- as a violation
    --------------------------------------------------
    local alreadyViolated=redis.call("GET",violationKey)

    if not alreadyViolated then
        --------------------------------------------------
        -- Increment abuse count
        --------------------------------------------------
        local abuseCount=redis.call("INCR",abuseKey)

        --------------------------------------------------
        -- Start abuse window
        --------------------------------------------------
        if abuseCount==1 then
            redis.call("EXPIRE",abuseKey,CLIENT_LIMIT_WINDOW)
        end

        --------------------------------------------------
        -- Mark current window as violated
        --------------------------------------------------
        redis.call("SET",violationKey,"true","EX",WINDOW_SIZE)

        --------------------------------------------------
        -- 5+ violations → block IP
        --------------------------------------------------
        if abuseCount>=5 then
            redis.call("SET",blockKey,"true","EX",BLOCK_WINDOW)

            return {
                "BLOCKED",
                BLOCK_WINDOW
            }
        end

        --------------------------------------------------
        -- 3+ violations → CAPTCHA
        --------------------------------------------------
        if abuseCount>=3 then
            local ttl=redis.call("TTL",redisKey)

            return {
                "CAPTCHA",
                ttl
            }
        end

    end

    --------------------------------------------------
    -- Already violated this window OR abuse < 3
    -- → normal 429
    --------------------------------------------------
    local ttl=redis.call("TTL",redisKey)

    return {
        "RATE_LIMITED",
        ttl
    }
end

--------------------------------------------------
-- 5. Check client-level limit
--
-- This catches IP rotation while maintaining
-- the same clientId.
--------------------------------------------------
if clientReq > MAX_CLIENT_REQ then

    local ttl = redis.call("TTL", clientKey)

    return {
        "CLIENT_LIMITED",
        ttl
    }
end

--------------------------------------------------
-- 6. Everything is okay
--------------------------------------------------
return {
    "OK",
    currentReq,
    clientReq
}
