import { describe, it, expect, beforeEach } from 'vitest';
import { User } from "../../../../public/shared/user.js";

describe("User creation", () => {
    let user;

    beforeEach(() => {
        user = new User({
            name: "Alice",
            type: User.type.player,
            id: "456",
            privateId: "123"
        });
    });
    
    it('creates user with correct name', () => {
        expect(user.name).toBe('Alice');
    });

    it('creates user with correct id', () => {
        expect(user.id).toBe('456');
    });

    it('user is a player', () => {
        expect(user.isPlayer).toBe(true);
    });
});

describe("User proxy", () => {
    let user, proxy;

    beforeEach(() => {
        user = new User({
            name: "Alice",
            type: User.type.player,
            id: "456",
            privateId: "123"
        });
        proxy = user.proxy;
    });

    it("reflects user properties", () => {
        expect(proxy.name).toBe("Alice");
        expect(proxy.type).toBe(User.type.player);
        expect(proxy.id).toBe("456");
        expect(proxy._privateId).toBe("123");
        expect(proxy.isPlayer).toBe(true);
    });

    it("has its own api", () => {
        user._api = "user test api";
        expect(user.api).toBe("user test api");
        expect(proxy.api).toBeNull();
        proxy._api = "proxy test api";
        expect(user.api).toBe("user test api");
        expect(proxy.api).toBe("proxy test api");
    });
    it('cannot set api directly on proxy', () => {
        expect(() => { proxy.api = 'test'; }).toThrow(TypeError);
    });
    it('cannot read _api from proxy', () => {
        proxy._api = "proxy test api";
        expect(proxy._api).toBeUndefined();
    });
    it("reads extra properties on the user", () => {
        user.test = "user test";
        expect(proxy.test).toBe("user test");
        proxy.test = "proxy test";
        expect(user.test).toBe("user test");
    });
    it("can have unique properties", () => {
        proxy.test = "proxy test";
        expect(proxy.test).toBe("proxy test");
        expect(user.test).toBeUndefined();
    })
});

describe("User proxy proxy", () => {
    let user, proxy1, proxy2;

    beforeEach(() => {
        user = new User({
            name: "Alice",
            type: User.type.player,
            id: "456",
            privateId: "123"
        });
        proxy1 = user.proxy;
        proxy2 = proxy1.proxy;
    });

    it("reflects user properties", () => {
        expect(proxy2.name).toBe("Alice");
        expect(proxy2.type).toBe(User.type.player);
        expect(proxy2.id).toBe("456");
        expect(proxy2._privateId).toBe("123");
        expect(proxy2.isPlayer).toBe(true);
    });

    it("has its own api", () => {
        user._api = "user test api";
        proxy1._api = "proxy1 test api";
        expect(user.api).toBe("user test api");
        expect(proxy1.api).toBe("proxy1 test api");
        expect(proxy2.api).toBeNull();
        proxy2._api = "proxy2 test api";
        expect(user.api).toBe("user test api");
        expect(proxy1.api).toBe("proxy1 test api");
        expect(proxy2.api).toBe("proxy2 test api");
    });
    it("is a proxy of user", () => {
        proxy1.test = "proxy test";
        expect(proxy1.test).toBe("proxy test");
        expect(user.test).toBeUndefined();
        proxy2 = proxy1.proxy;
        expect(proxy2.test).toBeUndefined();
    })
});
