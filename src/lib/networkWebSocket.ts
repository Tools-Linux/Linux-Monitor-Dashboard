import * as signalR from "@microsoft/signalr";

export const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://192.168.1.39:5000/ws/network")
    .withAutomaticReconnect()
    .build();