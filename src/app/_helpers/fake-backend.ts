﻿import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpResponse,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HTTP_INTERCEPTORS,
} from "@angular/common/http";
import { Observable, of, throwError } from "rxjs";
import { delay, mergeMap, materialize, dematerialize } from "rxjs/operators";

import { User } from "@app/_models";
import { AuthenticationService } from "@app/_services";
import { EncodingTools } from "./encoding-tools";

const users: User[] = [
  {
    id: 1,
    username: "test",
    password: "test",
    firstName: "Test",
    lastName: "User",
  },
  {
    id: 2,
    username: "George.M",
    password: "test",
    firstName: "George",
    lastName: "Mikelis",
  },
];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthenticationService) {}

  // route functions

  authenticate(request) {
    const { username, password } = request.body;
    const user = users.find(
      (x) => x.username === username && x.password === password
    );
    if (!user) return this.error("Username or password is incorrect");
    const token = EncodingTools.encode(user);
    return this.ok({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      token: token,
    });
  }

  getUsers(request) {
    if (!this.isLoggedIn(request)) return this.unauthorized();
    return this.ok(users);
  }

  createUser(request) {
    const newUser = request.body;
    let bigestId: number = Math.max.apply(Math, users.map(function(o) { return o.id; }))
    const newId: number = bigestId + 1;
    const user = { id: newId, ...newUser };
    console.log(user);
    users.push(user);
    const token = EncodingTools.encode(user);
    return this.ok({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      token: token,
    });
  }

  // helper functions
  ok(body?) {
    return of(new HttpResponse({ status: 200, body }));
  }

  error(message) {
    return throwError({ error: { message } });
  }

  unauthorized() {
    return throwError({ status: 401, error: { message: "Unauthorised" } });
  }

  isLoggedIn(request) {
    console.log(
      EncodingTools.encode(this.authenticationService.currentUserValue),
      request.headers.get("Authorization")
    );
    return (
      request.headers.get("Authorization") ===
      "Bearer " +
        EncodingTools.encode(this.authenticationService.currentUserValue)
    );
  }

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const { url, method } = request;

    switch (true) {
      case url.endsWith("/users/authenticate") && method === "POST":
        return this.authenticate(request);
      case url.endsWith("/users") && method === "GET":
        return this.getUsers(request);
      case url.endsWith("/users") && method === "POST":
        return this.createUser(request);
      default:
        // pass through any requests not handled above
        return next.handle(request);
    }
  }
}

export let fakeBackendProvider = {
  // use fake backend in place of Http service for backend-less development
  provide: HTTP_INTERCEPTORS,
  useClass: FakeBackendInterceptor,
  multi: true,
};
