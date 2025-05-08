#include <stdio.h>
#include <stdlib.h>
#include "btlib.h"

int classic_callback(int clientnode,unsigned char *dat,int len);

int main()
  {
     
  if(init_blue("devices.txt") == 0)
    return(0);

  classic_server(ANY_DEVICE,classic_callback,10,KEY_ON | PASSKEY_LOCAL);
  
  // Try various combinations of KEY_ and PASSKEY_ options
  // described in documentation 4.2.2

  // For more security, to only accept connections from a specified device
  // defined as node 4 in devices.txt
  // classic_server(4,classic_callback,10,KEY_ON | PASSKEY_LOCAL);
  
  // classic_server may have to be called twice - once to pair and second to connect
  
  close_all();
  return(0);
  }
  

int classic_callback(int clientnode,unsigned char *dat,int len)
  {
  int n;
  
  printf("Data = ");
    
  for(n = 0 ; n < len ; ++n)
    printf(" %02X",dat[n]);
  printf("\n");
  
  // Trigger exit from classic_server by:
  // return(SERVER_EXIT);
  
  return(SERVER_CONTINUE);
  }
