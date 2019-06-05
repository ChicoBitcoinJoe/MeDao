import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from "@angular/platform-browser";

import { Web3Service } from './services/web3/web3.service';
import { UserService } from './services/user/user.service';

declare let web3: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

    constructor (
          private matIconRegistry: MatIconRegistry,
          private domSanitizer: DomSanitizer,
          public Web3: Web3Service,
          public User: UserService,
      ) {
          this.Web3.setAllowedNetworks(['kovan']);

          this.Web3.ready()
          .then(() => {
              console.log(this.Web3.network);
              console.log(this.Web3.account);
              if(this.Web3.account.signedIn){
                  this.User.signIn();
              }
              else {
                  // logged in = false
              }
          })
          .catch(err => {
              console.warn(err);
          });

          this.matIconRegistry.addSvgIcon("qrcode", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/qrcode.svg"));
      }

}
